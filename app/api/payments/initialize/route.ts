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
      const priceNaira = toNaira(preflight.price, preflight.currency);
      return {
        productId: product!.id,
        variantId: preflight.variantId,
        sku: preflight.sku,
        gtin: preflight.gtin,
        selectedOptions: preflight.selectedOptions,
        title: product!.title,
        vendorName: product!.vendorName,
        vendorUrl: product!.vendorUrl,
        priceNaira,
        qty: input.items[i].qty,
      };
    }));
    const subtotalNaira = pricedItems.reduce((sum, item) => sum + item.priceNaira * item.qty, 0);
    // Launch pilot: the first payment covers products only. DHL/international
    // delivery is quoted and collected separately after packaging and measuring.
    const totalNaira = subtotalNaira;

    const reference = generatePaymentReference();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;

    const { authorizationUrl } = await initializePayment({
      email: input.email,
      amountNaira: totalNaira,
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
        subtotalNaira,
        totalNaira,
      },
    });

    return NextResponse.json({ success: true, data: { authorizationUrl, reference } });
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
