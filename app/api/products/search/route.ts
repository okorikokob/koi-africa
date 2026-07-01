import { NextRequest, NextResponse } from "next/server";
import { searchShopifyProducts } from "@/lib/shopify-catalog";
import { toKoiProduct } from "@/lib/catalog-helpers";
import { persistAndMapProducts } from "@/lib/catalog-db";

export const dynamic = "force-dynamic";

// Rough category guess from the query so persisted search results land in a
// sensible bucket (used for filters + related products).
function inferCategory(q: string): string {
  const s = q.toLowerCase();
  if (/(skincare|makeup|beauty|serum|fragrance|perfume|lipstick)/.test(s)) return "beauty";
  if (/(sneaker|shoe|boot|heel|trainer|footwear)/.test(s)) return "shoes";
  if (/(phone|laptop|headphone|earbud|electronic|gadget|charger|speaker)/.test(s)) return "electronics";
  if (/(bag|handbag|watch|belt|wallet|sunglass|jewel|accessor)/.test(s)) return "accessories";
  if (/(home|decor|kitchen|furniture|lamp|bedding)/.test(s)) return "home";
  return "fashion";
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim();

    if (!q) {
      return NextResponse.json(
        { success: false, error: "Missing required query parameter: q" },
        { status: 400 },
      );
    }

    // Live breadth: search the full Shopify catalog, not just seeded rows.
    const shopify = await searchShopifyProducts(q, 40);
    const koi = shopify.map((p) => toKoiProduct(p, inferCategory(q)));

    // Persist on the fly so each result's detail page (gallery/colors) works by DB id.
    const products = await persistAndMapProducts(koi, inferCategory(q));

    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error("[api/products/search]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
