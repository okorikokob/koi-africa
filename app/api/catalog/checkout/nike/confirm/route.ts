import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nikePostgresReadsEnabled } from "@/lib/catalog-feature-flags";
import { confirmConfiguredNikeCheckout } from "@/lib/nike-checkout-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const requestSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    sourceVariantId: z.string().min(1),
  })).min(1).max(25),
});

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid Nike checkout items." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!nikePostgresReadsEnabled()) {
    return NextResponse.json(
      { success: true, data: { status: "ready", prices: [], message: null } },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const result = await confirmConfiguredNikeCheckout(parsed.data.items);
    return NextResponse.json(
      { success: true, data: result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[api/catalog/checkout/nike/confirm]", error);
    return NextResponse.json(
      { success: false, error: "Nike availability confirmation failed." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
