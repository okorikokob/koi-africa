import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { initializePaymentSchema } from "@/lib/schemas";
import { getProductById } from "@/lib/catalog-db";
import { calculateDeliveryFee } from "@/lib/pricing-config";
import { toNaira } from "@/lib/currency";
import { initializePayment, generatePaymentReference } from "@/lib/paystack";

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
    const products = await Promise.all(input.items.map((item) => getProductById(item.productId)));
    const missingIndex = products.findIndex((p) => p === null);
    if (missingIndex !== -1) {
      return NextResponse.json(
        { success: false, error: "One of the items in your cart is no longer available." },
        { status: 400 },
      );
    }

    const pricedItems = products.map((product, i) => {
      const priceNaira = toNaira(product!.priceAmount, product!.priceCurrency);
      return {
        productId: product!.id,
        title: product!.title,
        vendorName: product!.vendorName,
        vendorUrl: product!.vendorUrl,
        priceNaira,
        qty: input.items[i].qty,
      };
    });
    const subtotalNaira = pricedItems.reduce((sum, item) => sum + item.priceNaira * item.qty, 0);
    const deliveryFeeNaira = calculateDeliveryFee(subtotalNaira);
    const totalNaira = subtotalNaira + deliveryFeeNaira;

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
        deliveryFeeNaira,
        totalNaira,
      },
    });

    return NextResponse.json({ success: true, data: { authorizationUrl, reference } });
  } catch (error) {
    console.error("[api/payments/initialize]", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
