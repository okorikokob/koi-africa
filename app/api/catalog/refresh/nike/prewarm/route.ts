import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nikePostgresReadsEnabled } from "@/lib/catalog-feature-flags";
import { prewarmConfiguredNikeProduct } from "@/lib/nike-demand-refresh-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const requestSchema = z.object({
  productId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ accepted: false, error: "Invalid product." }, { status: 400 });
  }

  if (!nikePostgresReadsEnabled()) {
    return NextResponse.json({ accepted: true, skipped: true }, { status: 202 });
  }

  after(async () => {
    try {
      await prewarmConfiguredNikeProduct(parsed.data.productId);
    } catch (error) {
      console.error("[api/catalog/refresh/nike/prewarm]", error);
    }
  });

  return NextResponse.json({ accepted: true, skipped: false }, { status: 202 });
}
