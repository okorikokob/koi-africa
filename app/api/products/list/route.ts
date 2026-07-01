import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/catalog-db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const categories = params.getAll("category").filter(Boolean);
    const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(48, Math.max(1, parseInt(params.get("pageSize") ?? "24", 10) || 24));

    const { products, total } = await getProducts({ categories, page, pageSize });

    return NextResponse.json({ success: true, data: products, total });
  } catch (error) {
    console.error("[api/products/list]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
