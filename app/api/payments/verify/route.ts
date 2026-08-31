import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { verifyPayment, generatePaymentReference } from "@/lib/paystack";
import {
  DrizzleVerifiedPurchaseStore,
  persistVerifiedPurchase,
  safePersistenceError,
  type PaidItemInput,
} from "@/lib/payment-persistence";

const verifyBodySchema = z.object({ reference: z.string().min(1) });

type OrderMetadata = {
  fullName: string;
  whatsapp: string;
  address: string;
  city: string;
  state: string;
  landmark?: string;
  items: PaidItemInput[];
  subtotalNaira: number;
  totalNaira: number;
};

const store = new DrizzleVerifiedPurchaseStore(db);

export async function POST(req: NextRequest) {
  try {
    const parsed = verifyBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const reference = parsed.data.reference;
    const existing = await store.findByProviderReference(reference);
    if (existing) {
      return NextResponse.json({
        success: true,
        data: {
          orderReference: existing.orderReference,
          totalNaira: existing.totalMinor / 100,
          items: existing.items,
        },
      });
    }

    const result = await verifyPayment(reference);
    if (!result.success) {
      return NextResponse.json({ success: false, error: "Payment was not successful." }, { status: 402 });
    }

    const metadata = result.metadata as unknown as OrderMetadata;
    if (!metadata?.items?.length) {
      return NextResponse.json(
        { success: false, error: "Payment verified but order details are missing." },
        { status: 500 },
      );
    }
    if (Math.round(result.amountNaira * 100) !== Math.round(metadata.totalNaira * 100)) {
      return NextResponse.json({ success: false, error: "Payment amount mismatch." }, { status: 402 });
    }

    try {
      const purchase = await persistVerifiedPurchase({
        providerReference: reference,
        orderReference: generatePaymentReference(),
        customerName: metadata.fullName,
        customerEmail: result.email,
        customerPhone: metadata.whatsapp,
        deliveryAddress: metadata.address,
        deliveryCity: metadata.city,
        deliveryRegion: metadata.state,
        deliveryLandmark: metadata.landmark || null,
        subtotalNaira: metadata.subtotalNaira,
        totalNaira: metadata.totalNaira,
        channel: result.channel,
        items: metadata.items,
      }, store);
      return NextResponse.json({
        success: true,
        data: {
          orderReference: purchase.orderReference,
          totalNaira: purchase.totalMinor / 100,
          items: purchase.items,
        },
      });
    } catch (error) {
      console.error("[api/payments/verify] atomic persistence failed", safePersistenceError(error));
      return NextResponse.json(
        { success: false, error: "Payment succeeded but order creation failed. Retry verification or contact support." },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("[api/payments/verify]", safePersistenceError(error));
    return NextResponse.json(
      { success: false, error: "Something went wrong verifying your payment." },
      { status: 500 },
    );
  }
}
