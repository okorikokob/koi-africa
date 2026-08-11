import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/catalog-db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim();

    if (!q) {
      return NextResponse.json(
        { success: false, error: "Missing required query parameter: q" },
        { status: 400 },
      );
    }

    const products = await searchProducts(q, 40);

    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error("[api/products/search]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
