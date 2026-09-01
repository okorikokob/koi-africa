import { and, eq, inArray } from "drizzle-orm";
import type { db } from "@/database/client";
import { orderItems, orders, payments, productImages, products, productVariants } from "@/database/schema";

export type PaidItemInput = {
  productId: string;
  variantId: string | null;
  sku: string | null;
  gtin: string | null;
  selectedOptions: Array<{ name: string; value: string }>;
  title: string;
  vendorName: string;
  vendorUrl: string;
  sourceCurrency: string;
  sourceUnitPriceMinor: number;
  acquisitionUnitMinor: number;
  serviceMarginUnitMinor: number;
  sellingUnitMinor: number;
  exchangeRateSnapshot: Record<string, unknown> | null;
  qty: number;
};

export type VerifiedPurchaseInput = {
  providerReference: string;
  orderReference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryRegion: string;
  deliveryLandmark: string | null;
  acquisitionSubtotalMinor: number;
  serviceMarginMinor: number;
  sellingSubtotalMinor: number;
  logisticsDepositMinor: number;
  customsTotalMinor: number;
  firstPaymentTotalMinor: number;
  exchangeRateSnapshot: Record<string, unknown> | null;
  channel: string;
  items: PaidItemInput[];
};

export type PersistedPurchase = {
  orderId: string;
  orderReference: string;
  totalMinor: number;
  items: Array<{ title: string; qty: number; image: string | null }>;
};

export type ResolvedItem = PaidItemInput & {
  internalProductId: string;
  internalVariantId: string;
  sourceProductId: string;
  sourceVariantId: string;
  brandName: string;
  imageUrl: string | null;
};

export interface VerifiedPurchaseStore {
  findByProviderReference(reference: string): Promise<PersistedPurchase | null>;
  resolveItems(items: PaidItemInput[]): Promise<ResolvedItem[]>;
  createAtomic(input: VerifiedPurchaseInput, resolvedItems: ResolvedItem[]): Promise<PersistedPurchase>;
  isProviderReferenceConflict(error: unknown): boolean;
}

function assertMinor(amount: number, label: string): number {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error(`${label} is not valid minor-unit money.`);
  return amount;
}

export async function persistVerifiedPurchase(
  input: VerifiedPurchaseInput,
  store: VerifiedPurchaseStore,
): Promise<PersistedPurchase> {
  const existing = await store.findByProviderReference(input.providerReference);
  if (existing) return existing;

  const acquisitionSubtotalMinor = assertMinor(input.acquisitionSubtotalMinor, "Acquisition subtotal");
  const serviceMarginMinor = assertMinor(input.serviceMarginMinor, "Service margin");
  const sellingSubtotalMinor = assertMinor(input.sellingSubtotalMinor, "Selling subtotal");
  const logisticsDepositMinor = assertMinor(input.logisticsDepositMinor, "Logistics deposit");
  const firstPaymentTotalMinor = assertMinor(input.firstPaymentTotalMinor, "First payment total");
  const itemAcquisitionMinor = input.items.reduce((sum, item) => sum + assertMinor(item.acquisitionUnitMinor, "Item acquisition") * item.qty, 0);
  const itemMarginMinor = input.items.reduce((sum, item) => sum + assertMinor(item.serviceMarginUnitMinor, "Item margin") * item.qty, 0);
  const itemSellingMinor = input.items.reduce((sum, item) => sum + assertMinor(item.sellingUnitMinor, "Item selling price") * item.qty, 0);
  if (
    acquisitionSubtotalMinor !== itemAcquisitionMinor
    || serviceMarginMinor !== itemMarginMinor
    || sellingSubtotalMinor !== itemSellingMinor
    || sellingSubtotalMinor !== acquisitionSubtotalMinor + serviceMarginMinor
    || firstPaymentTotalMinor !== sellingSubtotalMinor + logisticsDepositMinor
  ) {
    throw new Error("Verified payment amount does not match the authoritative pricing breakdown.");
  }

  const resolvedItems = await store.resolveItems(input.items);
  if (resolvedItems.length !== input.items.length) throw new Error("A paid product or exact variant could not be resolved.");

  try {
    return await store.createAtomic(input, resolvedItems);
  } catch (error) {
    if (!store.isProviderReferenceConflict(error)) throw error;
    const winner = await store.findByProviderReference(input.providerReference);
    if (!winner) throw error;
    return winner;
  }
}

type Database = typeof db;

export class DrizzleVerifiedPurchaseStore implements VerifiedPurchaseStore {
  constructor(private readonly database: Database) {}

  async findByProviderReference(reference: string): Promise<PersistedPurchase | null> {
    const [row] = await this.database.select({
      orderId: orders.id,
      orderReference: orders.reference,
      totalMinor: orders.totalMinor,
    }).from(payments)
      .innerJoin(orders, eq(payments.orderId, orders.id))
      .where(and(eq(payments.provider, "paystack"), eq(payments.providerReference, reference)))
      .limit(1);
    if (!row) return null;
    return { ...row, items: await this.getSummaryItems(row.orderId) };
  }

  async resolveItems(items: PaidItemInput[]): Promise<ResolvedItem[]> {
    const productIds = [...new Set(items.map((item) => item.productId))];
    const rows = await this.database.select({
      internalProductId: products.id,
      internalVariantId: productVariants.id,
      sourceProductId: products.sourceProductId,
      sourceVariantId: productVariants.sourceVariantId,
      brandName: products.provider,
      imageUrl: productImages.sourceUrl,
    }).from(products)
      .innerJoin(productVariants, eq(productVariants.productId, products.id))
      .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.position, 0)))
      .where(inArray(products.id, productIds));

    return items.map((item) => {
      const match = rows.find((row) => row.internalProductId === item.productId && row.sourceVariantId === item.variantId);
      if (!match || !item.variantId) throw new Error(`Exact paid variant could not be resolved for product ${item.productId}.`);
      return { ...item, ...match, brandName: item.vendorName };
    });
  }

  async createAtomic(input: VerifiedPurchaseInput, resolvedItems: ResolvedItem[]): Promise<PersistedPurchase> {
    return this.database.transaction(async (transaction) => {
      const subtotalMinor = assertMinor(input.acquisitionSubtotalMinor, "Acquisition subtotal");
      const totalMinor = assertMinor(input.firstPaymentTotalMinor, "First payment total");
      const [order] = await transaction.insert(orders).values({
        reference: input.orderReference,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        deliveryAddress: input.deliveryAddress,
        deliveryCity: input.deliveryCity,
        deliveryRegion: input.deliveryRegion,
        deliveryCountryCode: "NG",
        deliveryLandmark: input.deliveryLandmark,
        pricingCurrency: "NGN",
        displayCurrency: "NGN",
        productSubtotalMinor: subtotalMinor,
        serviceFeeMinor: input.serviceMarginMinor,
        shippingTotalMinor: 0,
        customsTotalMinor: input.customsTotalMinor,
        logisticsDepositMinor: input.logisticsDepositMinor,
        actualLogisticsMinor: null,
        logisticsAdjustmentMinor: null,
        logisticsReconciliationStatus: "pending_measurement",
        totalMinor,
        exchangeRateSnapshot: input.exchangeRateSnapshot,
        status: "paid",
      }).returning({ id: orders.id, reference: orders.reference });
      if (!order) throw new Error("Order insert returned no row.");

      await transaction.insert(orderItems).values(resolvedItems.map((item) => ({
        orderId: order.id,
        productId: item.internalProductId,
        variantId: item.internalVariantId,
        sourceProductId: item.sourceProductId,
        sourceVariantId: item.sourceVariantId,
        sku: item.sku,
        gtin: item.gtin,
        title: item.title,
        brandName: item.brandName,
        imageUrl: item.imageUrl,
        vendorName: item.vendorName,
        vendorUrl: item.vendorUrl,
        selectedOptions: item.selectedOptions,
        currency: "NGN",
        unitPriceMinor: item.sellingUnitMinor,
        sourceCurrency: item.sourceCurrency,
        sourceUnitPriceMinor: item.sourceUnitPriceMinor,
        acquisitionUnitMinor: item.acquisitionUnitMinor,
        serviceMarginUnitMinor: item.serviceMarginUnitMinor,
        sellingUnitMinor: item.sellingUnitMinor,
        exchangeRateSnapshot: item.exchangeRateSnapshot ?? {},
        quantity: item.qty,
      })));

      await transaction.insert(payments).values({
        orderId: order.id,
        purpose: "product_and_service",
        provider: "paystack",
        providerReference: input.providerReference,
        currency: "NGN",
        expectedAmountMinor: totalMinor,
        verifiedAmountMinor: totalMinor,
        status: "success",
        channel: input.channel,
        verifiedAt: new Date(),
      });

      return {
        orderId: order.id,
        orderReference: order.reference,
        totalMinor,
        items: resolvedItems.map((item) => ({ title: item.title, qty: item.qty, image: item.imageUrl })),
      };
    });
  }

  isProviderReferenceConflict(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
  }

  private async getSummaryItems(orderId: string) {
    return this.database.select({ title: orderItems.title, qty: orderItems.quantity, image: orderItems.imageUrl })
      .from(orderItems).where(eq(orderItems.orderId, orderId));
  }
}

export function safePersistenceError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { message: String(error) };
  const databaseError = error as Error & { code?: string; constraint?: string; detail?: string; table?: string };
  return {
    name: error.name,
    message: error.message,
    code: databaseError.code,
    constraint: databaseError.constraint,
    table: databaseError.table,
    detail: databaseError.detail,
  };
}
