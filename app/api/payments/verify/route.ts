import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPayment, generatePaymentReference } from "@/lib/paystack";
import { createInsforgeServer } from "@/lib/insforge-server";

const verifyBodySchema = z.object({ reference: z.string().min(1) });

type OrderMetadata = {
  fullName: string;
  email?: string;
  whatsapp: string;
  address: string;
  city: string;
  state: string;
  landmark?: string;
  items: Array<{
    productId: string;
    title: string;
    vendorName: string;
    vendorUrl: string;
    priceNaira: number;
    qty: number;
  }>;
  subtotalNaira: number;
  deliveryFeeNaira: number;
  totalNaira: number;
};

type OrderSummaryItem = { title: string; qty: number; image: string | null };

// Order items don't store an image directly — look it up from the linked
// product row (nullable if the product was later removed from the catalog).
async function getOrderSummaryItems(
  insforge: ReturnType<typeof createInsforgeServer>,
  orderId: string,
): Promise<OrderSummaryItem[]> {
  const { data: rows } = await insforge.database
    .from("order_items")
    .select("title, quantity, product_id")
    .eq("order_id", orderId);
  const items = (rows ?? []) as Array<{ title: string; quantity: number; product_id: string | null }>;

  const productIds = items.map((i) => i.product_id).filter((id): id is string => Boolean(id));
  const imageByProductId = new Map<string, string | null>();
  if (productIds.length > 0) {
    const { data: products } = await insforge.database
      .from("products")
      .select("id, image_url")
      .in("id", productIds);
    for (const p of (products ?? []) as Array<{ id: string; image_url: string | null }>) {
      imageByProductId.set(p.id, p.image_url);
    }
  }

  return items.map((item) => ({
    title: item.title,
    qty: item.quantity,
    image: item.product_id ? (imageByProductId.get(item.product_id) ?? null) : null,
  }));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let reference: string;
    try {
      ({ reference } = verifyBodySchema.parse(body));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: error.issues[0].message },
          { status: 400 },
        );
      }
      throw error;
    }

    const insforge = createInsforgeServer();

    // Idempotent: a prior verify call (e.g. page refresh) already recorded this payment.
    const { data: existingPayment } = await insforge.database
      .from("payments")
      .select("order_id")
      .eq("paystack_ref", reference)
      .maybeSingle();

    if (existingPayment) {
      const orderId = (existingPayment as { order_id: string }).order_id;
      const { data: order } = await insforge.database
        .from("orders")
        .select("reference, total_naira")
        .eq("id", orderId)
        .maybeSingle();
      const summary = order as { reference: string; total_naira: number } | null;
      return NextResponse.json({
        success: true,
        data: {
          orderReference: summary?.reference ?? reference,
          totalNaira: summary?.total_naira ?? 0,
          items: await getOrderSummaryItems(insforge, orderId),
        },
      });
    }

    const result = await verifyPayment(reference);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Payment was not successful." },
        { status: 402 },
      );
    }

    const metadata = result.metadata as unknown as OrderMetadata;
    if (!metadata?.items?.length) {
      return NextResponse.json(
        { success: false, error: "Payment verified but order details are missing." },
        { status: 500 },
      );
    }

    // Verified amount must match what we quoted at initialize time.
    if (Math.round(result.amountNaira) !== Math.round(metadata.totalNaira)) {
      return NextResponse.json(
        { success: false, error: "Payment amount mismatch." },
        { status: 402 },
      );
    }

    const orderReference = generatePaymentReference();

    const { data: order, error: orderError } = await insforge.database
      .from("orders")
      .insert({
        reference: orderReference,
        customer_name: metadata.fullName,
        customer_email: result.email,
        customer_phone: metadata.whatsapp,
        delivery_address: metadata.address,
        delivery_city: metadata.city,
        delivery_state: metadata.state,
        landmark: metadata.landmark || null,
        status: "paid",
        subtotal_naira: metadata.subtotalNaira,
        delivery_fee_naira: metadata.deliveryFeeNaira,
        total_naira: metadata.totalNaira,
        payment_reference: reference,
        payment_status: "paid",
      })
      .select("id, reference")
      .single();

    if (orderError || !order) {
      console.error("[api/payments/verify] order insert failed", orderError);
      return NextResponse.json(
        { success: false, error: "Payment succeeded but order creation failed. Contact support." },
        { status: 500 },
      );
    }

    const orderId = (order as { id: string }).id;

    const orderItemRows = metadata.items.map((item) => ({
      order_id: orderId,
      product_id: item.productId,
      title: item.title,
      vendor_name: item.vendorName,
      vendor_url: item.vendorUrl,
      price_paid: item.priceNaira,
      price_currency: "NGN",
      quantity: item.qty,
    }));
    await insforge.database.from("order_items").insert(orderItemRows);

    await insforge.database.from("payments").insert({
      order_id: orderId,
      paystack_ref: reference,
      amount: result.amountNaira,
      status: "success",
      channel: result.channel,
      verified_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: {
        orderReference: (order as { reference: string }).reference,
        totalNaira: metadata.totalNaira,
        items: await getOrderSummaryItems(insforge, orderId),
      },
    });
  } catch (error) {
    console.error("[api/payments/verify]", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong verifying your payment." },
      { status: 500 },
    );
  }
}
