import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { trackOrderSchema } from "@/lib/schemas";
import { createInsforgeServer } from "@/lib/insforge-server";

type OrderRow = {
  id: string;
  reference: string;
  customer_email: string;
  delivery_address: string;
  delivery_city: string;
  delivery_state: string;
  status: string;
  subtotal_naira: number;
  delivery_fee_naira: number;
  total_naira: number;
  created_at: string;
};

type OrderItemRow = {
  title: string;
  quantity: number;
  product_id: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let input;
    try {
      input = trackOrderSchema.parse(body);
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

    const { data: order } = await insforge.database
      .from("orders")
      .select(
        "id, reference, customer_email, delivery_address, delivery_city, delivery_state, status, subtotal_naira, delivery_fee_naira, total_naira, created_at",
      )
      .eq("reference", input.reference.trim().toUpperCase())
      .ilike("customer_email", input.email.trim())
      .maybeSingle();

    if (!order) {
      return NextResponse.json(
        { success: false, error: "No order found for that reference and email." },
        { status: 404 },
      );
    }

    const row = order as OrderRow;

    const { data: itemRows } = await insforge.database
      .from("order_items")
      .select("title, quantity, product_id")
      .eq("order_id", row.id);

    const items = (itemRows ?? []) as OrderItemRow[];
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

    return NextResponse.json({
      success: true,
      data: {
        reference: row.reference,
        status: row.status,
        deliveryAddress: row.delivery_address,
        deliveryCity: row.delivery_city,
        deliveryState: row.delivery_state,
        subtotalNaira: row.subtotal_naira,
        deliveryFeeNaira: row.delivery_fee_naira,
        totalNaira: row.total_naira,
        createdAt: row.created_at,
        items: items.map((item) => ({
          title: item.title,
          qty: item.quantity,
          image: item.product_id ? (imageByProductId.get(item.product_id) ?? null) : null,
        })),
      },
    });
  } catch (error) {
    console.error("[api/orders/track]", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
