import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { initializePaymentSchema } from "@/lib/schemas";
import { getProductById } from "@/lib/catalog-db";
import { toNaira } from "@/lib/currency";
import { initializePayment, generatePaymentReference } from "@/lib/paystack";
import { preflightPaymentItem } from "@/lib/payment-item-preflight";
import { isConnectorRevalidationError } from "@/lib/connectors/types";
import { nikePostgresReadsEnabled } from "@/lib/catalog-feature-flags";
import { getNikePostgresProductById } from "@/lib/nike-postgres-catalog";
import { preflightNikePostgresPayment } from "@/lib/nike-checkout-service";
import { NikeCheckoutValidationError } from "@/lib/nike-checkout-validation";
import { preflightPaymentCatalogItem } from "@/lib/payment-catalog-preflight";
import { loadLatestDisplayRateSnapshot } from "@/lib/display-currency-server";
import {
  calculateNikeOrderPricing,
  calculateNikeUnitPricing,
} from "@/lib/nike-pricing";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let input;
    try {
      input = initializePaymentSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: error.issues[0].message },
          { status: 400 },
        );
      }
      throw error;
    }

    // Re-derive prices from the DB — never trust client-submitted amounts.
    const useNikePostgres = nikePostgresReadsEnabled();
    const postgresNikeProducts = useNikePostgres
      ? await Promise.all(input.items.map((item) => getNikePostgresProductById(item.productId)))
      : input.items.map(() => null);
    const products = await Promise.all(input.items.map((item, index) =>
      postgresNikeProducts[index] ?? getProductById(item.productId)
    ));
    const missingIndex = products.findIndex((p) => p === null);
    if (missingIndex !== -1) {
      return NextResponse.json(
        { success: false, error: "One of the items in your cart is no longer available." },
        { status: 400 },
      );
    }

    const hasPostgresNike = postgresNikeProducts.some((product) => product !== null);
    const exchangeRateSnapshot = hasPostgresNike ? await loadLatestDisplayRateSnapshot() : null;
    if (hasPostgresNike && !exchangeRateSnapshot) {
      throw new Error("Nike checkout exchange rates are not configured.");
    }

    const pricedItems = await Promise.all(products.map(async (product, i) => {
      const requestedVariantId = input.items[i].variantId;
      const isPostgresNike = useNikePostgres && postgresNikeProducts[i] !== null;
      const preflight = await preflightPaymentCatalogItem(
        { product: product!, requestedVariantId, usePostgresNike: isPostgresNike },
        {
          postgresNike: (productId, sourceVariantId) => preflightNikePostgresPayment(
            productId,
            sourceVariantId,
            (task) => after(task),
          ),
          legacy: preflightPaymentItem,
          missingNikeVariant: () => new NikeCheckoutValidationError(
            "VARIANT_UNAVAILABLE",
            "Select an exact Nike variant before checkout.",
          ),
        },
      );
      const nikePricing = isPostgresNike
        ? calculateNikeUnitPricing({
            sourcePrice: preflight.price,
            sourceCurrency: preflight.currency,
            exchangeRateSnapshot: exchangeRateSnapshot!,
          })
        : null;
      const acquisitionUnitMinor = nikePricing?.acquisitionUnitMinor
        ?? Math.round(toNaira(preflight.price, preflight.currency) * 100);
      const sellingUnitMinor = nikePricing?.sellingUnitMinor ?? acquisitionUnitMinor;
      return {
        productId: product!.id,
        variantId: preflight.variantId,
        sku: preflight.sku,
        gtin: preflight.gtin,
        selectedOptions: preflight.selectedOptions,
        title: product!.title,
        vendorName: product!.vendorName,
        vendorUrl: product!.vendorUrl,
        sourceCurrency: nikePricing?.sourceCurrency ?? preflight.currency.toUpperCase(),
        sourceUnitPriceMinor: nikePricing?.sourceUnitPriceMinor ?? Math.round(preflight.price * 100),
        acquisitionUnitMinor,
        serviceMarginUnitMinor: nikePricing?.serviceMarginUnitMinor ?? 0,
        sellingUnitMinor,
        exchangeRateSnapshot: nikePricing?.exchangeRateSnapshot ?? null,
        qty: input.items[i].qty,
      };
    }));
    const nikeOrderPricing = hasPostgresNike
      ? calculateNikeOrderPricing(pricedItems.map((item) => ({
          acquisitionUnitMinor: item.acquisitionUnitMinor,
          serviceMarginUnitMinor: item.serviceMarginUnitMinor,
          sellingUnitMinor: item.sellingUnitMinor,
          quantity: item.qty,
        })))
      : null;
    const acquisitionSubtotalMinor = nikeOrderPricing?.acquisitionSubtotalMinor
      ?? pricedItems.reduce((sum, item) => sum + item.acquisitionUnitMinor * item.qty, 0);
    const serviceMarginMinor = nikeOrderPricing?.serviceMarginMinor ?? 0;
    const sellingSubtotalMinor = nikeOrderPricing?.sellingSubtotalMinor ?? acquisitionSubtotalMinor;
    const logisticsDepositMinor = nikeOrderPricing?.logisticsDepositMinor ?? 0;
    const firstPaymentTotalMinor = nikeOrderPricing?.firstPaymentTotalMinor ?? sellingSubtotalMinor;

    const reference = generatePaymentReference();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;

    const { authorizationUrl } = await initializePayment({
      email: input.email,
      amountMinor: firstPaymentTotalMinor,
      reference,
      callbackUrl: `${siteUrl}/checkout/success?reference=${reference}`,
      metadata: {
        fullName: input.fullName,
        whatsapp: input.whatsapp,
        address: input.address,
        city: input.city,
        state: input.state,
        landmark: input.landmark ?? "",
        items: pricedItems,
        acquisitionSubtotalMinor,
        serviceMarginMinor,
        sellingSubtotalMinor,
        logisticsDepositMinor,
        customsTotalMinor: 0,
        firstPaymentTotalMinor,
        exchangeRateSnapshot,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        authorizationUrl,
        reference,
        pricing: {
          currency: "NGN",
          acquisitionSubtotalMinor,
          serviceMarginMinor,
          sellingSubtotalMinor,
          logisticsDepositMinor,
          customsTotalMinor: 0,
          firstPaymentTotalMinor,
        },
      },
    });
  } catch (error) {
    console.error("[api/payments/initialize]", error);
    if (error instanceof NikeCheckoutValidationError) {
      return NextResponse.json(
        { success: false, code: error.code, error: error.message },
        { status: error.code === "CATALOG_STALE" ? 409 : 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Something went wrong. Please try again." },
      { status: isConnectorRevalidationError(error) || (error instanceof Error && error.message.includes("variant")) ? 400 : 500 },
    );
  }
}
