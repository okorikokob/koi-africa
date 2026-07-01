import { NextResponse } from "next/server";
import { searchShopifyProducts } from "@/lib/shopify-catalog";
import { toKoiProduct } from "@/lib/catalog-helpers";
import { koiToInsert, type ProductInsert } from "@/lib/product-db";
import { createInsforgeServer } from "@/lib/insforge-server";
import type { Product } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Category buckets → the search query that populates each.
const BUCKETS: Array<{ category: string; query: string; limit: number }> = [
  { category: "fashion", query: "women clothing dress", limit: 12 },
  { category: "beauty", query: "skincare beauty makeup", limit: 10 },
  { category: "shoes", query: "sneakers shoes", limit: 10 },
  { category: "electronics", query: "electronics gadgets", limit: 8 },
  { category: "home", query: "home decor", limit: 8 },
  { category: "accessories", query: "luxury handbag accessories", limit: 8 },
];

function sourceFor(currency: string): Product["source"] {
  return currency?.toUpperCase() === "GBP" ? "UK" : "US";
}

export async function POST() {
  try {
    // 1. Fetch every bucket from Shopify, tagging each product with its category.
    const results = await Promise.all(
      BUCKETS.map(async ({ category, query, limit }) => {
        const products = await searchShopifyProducts(query, limit);
        return products.map((p) => ({ product: toKoiProduct(p, category), category }));
      }),
    );

    // 2. Flatten + dedupe by vendor id (buckets can overlap).
    const seen = new Set<string>();
    const rows: ProductInsert[] = [];
    let idx = 0;
    for (const bucket of results) {
      let inBucket = 0;
      for (const { product, category } of bucket) {
        if (!product.id || seen.has(product.id)) continue;
        seen.add(product.id);
        rows.push(
          koiToInsert(product, {
            category,
            isFeatured: inBucket < 2, // first 2 per category surface on the homepage
            tag: idx % 3 === 0 ? "bestseller" : idx % 3 === 1 ? "new" : undefined,
            source: sourceFor(product.priceCurrency),
          }),
        );
        inBucket++;
        idx++;
      }
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No products returned from catalog source" },
        { status: 502 },
      );
    }

    const insforge = createInsforgeServer();

    // 3. Full refresh: clear existing catalog, then insert the fresh batch.
    const { error: delError } = await insforge.database
      .from("products")
      .delete()
      .gte("synced_at", "1970-01-01T00:00:00Z");
    if (delError) throw new Error(`Clear failed: ${delError.message}`);

    const { data, error: insError } = await insforge.database
      .from("products")
      .insert(rows)
      .select();
    if (insError) throw new Error(`Insert failed: ${insError.message}`);

    return NextResponse.json({ success: true, data: { inserted: data?.length ?? 0 } });
  } catch (error) {
    console.error("[api/sync/products]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
