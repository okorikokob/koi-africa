import type { OrderStatus } from "@/lib/shipping";
import {
  isSupportedDisplayCurrency,
  type SupportedDisplayCurrency,
} from "@/lib/display-currency";

export type CustomerTrackingItemSnapshot = {
  title: string;
  brandName: string;
  imageUrl: string | null;
  quantity: number;
  selectedOptions: Array<{ name: string; value: string }>;
  sellingUnitMinor: number;
  sourceVariantId: string | null;
};

export type CustomerTrackingRecord = {
  reference: string;
  customerEmail: string;
  status: OrderStatus;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryRegion: string;
  deliveryLandmark: string | null;
  pricingCurrency: string;
  logisticsDepositMinor: number;
  totalMinor: number;
  createdAt: Date;
  items: CustomerTrackingItemSnapshot[];
  shipment: {
    provider: string;
    trackingNumber: string | null;
    status: string;
    events: Array<{ status: string; location: string | null; occurredAt: Date }>;
  } | null;
};

export type CustomerOrderTrackingResult = {
  reference: string;
  status: OrderStatus;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryRegion: string;
  deliveryLandmark: string | null;
  currency: SupportedDisplayCurrency;
  sellingSubtotalMinor: number;
  logisticsDepositMinor: number;
  totalMinor: number;
  createdAt: string;
  items: Array<{
    title: string;
    brandName: string;
    qty: number;
    image: string | null;
    selectedOptions: Array<{ name: string; value: string }>;
    sellingUnitMinor: number;
  }>;
  shipment: {
    provider: string;
    trackingNumber: string | null;
    status: string;
    events: Array<{ status: string; location: string | null; occurredAt: string }>;
  } | null;
};

export function normalizeOrderReference(reference: string): string {
  return reference.trim().toUpperCase();
}

export function normalizeCustomerEmail(email: string): string {
  return email.trim().toLowerCase();
}

function assertMinor(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} is not a valid minor-unit amount.`);
  }
  return value;
}

export function toCustomerOrderTrackingResult(
  record: CustomerTrackingRecord,
): CustomerOrderTrackingResult {
  if (!isSupportedDisplayCurrency(record.pricingCurrency)) {
    throw new Error("The customer tracking currency is unsupported.");
  }
  const items = record.items.map((item) => ({
    title: item.title,
    brandName: item.brandName,
    qty: item.quantity,
    image: item.imageUrl,
    selectedOptions: item.selectedOptions,
    sellingUnitMinor: assertMinor(item.sellingUnitMinor, "Item selling price"),
  }));
  const sellingSubtotalMinor = items.reduce((sum, item) => {
    const lineTotal = item.sellingUnitMinor * item.qty;
    return assertMinor(sum + lineTotal, "Selling subtotal");
  }, 0);
  const logisticsDepositMinor = assertMinor(record.logisticsDepositMinor, "Logistics deposit");
  const totalMinor = assertMinor(record.totalMinor, "Total paid");
  if (sellingSubtotalMinor + logisticsDepositMinor !== totalMinor) {
    throw new Error("The customer tracking total does not match its persisted components.");
  }

  return {
    reference: record.reference,
    status: record.status,
    deliveryAddress: record.deliveryAddress,
    deliveryCity: record.deliveryCity,
    deliveryRegion: record.deliveryRegion,
    deliveryLandmark: record.deliveryLandmark,
    currency: record.pricingCurrency,
    sellingSubtotalMinor,
    logisticsDepositMinor,
    totalMinor,
    createdAt: record.createdAt.toISOString(),
    items,
    shipment: record.shipment
      ? {
          provider: record.shipment.provider,
          trackingNumber: record.shipment.trackingNumber,
          status: record.shipment.status,
          events: record.shipment.events.map((event) => ({
            status: event.status,
            location: event.location,
            occurredAt: event.occurredAt.toISOString(),
          })),
        }
      : null,
  };
}
