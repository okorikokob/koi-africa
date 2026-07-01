// Server-side reads for the catalog. Pages import these instead of hitting the
// live Shopify API on every request. Populated by /api/sync/products.

import { createInsforgeServer } from "@/lib/insforge-server";
import { rowToKoi, koiToInsert, type ProductRow } from "@/lib/product-db";
import { searchShopifyProducts } from "@/lib/shopify-catalog";
import { toKoiProduct } from "@/lib/catalog-helpers";
import type { Product } from "@/types";

// Persist a batch of Shopify-sourced products (from live search) into the DB,
// then return them with their `id` swapped to the DB row id so detail pages —
// which read by DB id — work for search results too.
//
// `product.id` coming in is the vendor/Shopify external id. Idempotent: products
// already seeded are reused, only new ones are inserted. Safe under concurrency
// (the final re-select reconciles any rows inserted by a parallel request).
export async function persistAndMapProducts(
  products: Product[],
  category: string,
): Promise<Product[]> {
  const insforge = createInsforgeServer();
  const externalIds = products.map((p) => p.id).filter(Boolean);
  if (externalIds.length === 0) return products;

  const { data: existing } = await insforge.database
    .from("products")
    .select("id, external_id")
    .in("external_id", externalIds);
  const known = new Set((existing ?? []).map((r) => (r as { external_id: string }).external_id));

  const missing = products.filter((p) => p.id && !known.has(p.id));
  if (missing.length > 0) {
    const rows = missing.map((p) =>
      koiToInsert(p, {
        category,
        isFeatured: false,
        source: p.priceCurrency?.toUpperCase() === "GBP" ? "UK" : "US",
      }),
    );
    // Ignore errors (e.g. a UNIQUE race with a parallel search) — the re-select below reconciles.
    await insforge.database.from("products").insert(rows).select("id");
  }

  const { data: rows } = await insforge.database
    .from("products")
    .select("id, external_id")
    .in("external_id", externalIds);
  const idByExternal = new Map(
    (rows ?? []).map((r) => {
      const row = r as { id: string; external_id: string };
      return [row.external_id, row.id];
    }),
  );

  return products.map((p) => ({ ...p, id: idByExternal.get(p.id) ?? p.id }));
}

export type ProductListResult = {
  products: Product[];
  total: number;
};

export type ProductListOptions = {
  categories?: string[];
  page?: number;
  pageSize?: number;
};

// Paginated, optionally category-filtered product listing for /products.
// Ordering and slicing happen in the DB — never load the whole catalog client-side.
export async function getProducts({
  categories = [],
  page = 1,
  pageSize = 24,
}: ProductListOptions = {}): Promise<ProductListResult> {
  const insforge = createInsforgeServer();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = insforge.database
    .from("products")
    .select("*", { count: "exact" })
    .order("is_featured", { ascending: false })
    .order("synced_at", { ascending: false })
    .range(from, to);

  if (categories.length > 0) {
    query = query.in("category", categories);
  }

  const { data, error, count } = await query;
  if (error || !data) return { products: [], total: 0 };
  return { products: (data as ProductRow[]).map(rowToKoi), total: count ?? data.length };
}

// Distinct categories actually present in the catalog, for the filter sidebar.
// Only fetches the `category` column — cheap even as the catalog grows.
export async function getCategoryFacets(): Promise<string[]> {
  const insforge = createInsforgeServer();
  const { data, error } = await insforge.database
    .from("products")
    .select("category");
  if (error || !data) return [];
  const set = new Set(
    (data as Array<{ category: string | null }>)
      .map((r) => r.category)
      .filter((c): c is string => Boolean(c)),
  );
  return Array.from(set).sort();
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const insforge = createInsforgeServer();
  const { data, error } = await insforge.database
    .from("products")
    .select("*")
    .eq("is_featured", true)
    .limit(limit);
  if (error || !data) return [];
  return (data as ProductRow[]).map(rowToKoi);
}

export async function getProductById(id: string): Promise<Product | null> {
  const insforge = createInsforgeServer();
  const { data, error } = await insforge.database
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return rowToKoi(data as ProductRow);
}

export async function getRelatedProducts(
  category: string,
  excludeId: string,
  limit = 4,
): Promise<Product[]> {
  const insforge = createInsforgeServer();
  const { data, error } = await insforge.database
    .from("products")
    .select("*")
    .eq("category", category)
    .neq("id", excludeId)
    .limit(limit);
  if (error || !data) return [];
  return (data as ProductRow[]).map(rowToKoi);
}

// "You might also like" — semantic, title-based related products via the live
// Shopify catalog (relevant, like the original behaviour), persisted so links
// work by DB id. Falls back to same-category DB rows if the live search fails
// or returns too little.
export async function getRelatedProductsForTitle(
  title: string,
  category: string,
  excludeId: string,
  limit = 4,
): Promise<Product[]> {
  const query = title.split(" ").slice(0, 4).join(" ");
  try {
    const results = await searchShopifyProducts(query, limit + 4);
    if (results.length > 0) {
      const koi = results.map((p) => toKoiProduct(p, category));
      const persisted = await persistAndMapProducts(koi, category);
      const related = persisted.filter((p) => p.id !== excludeId).slice(0, limit);
      if (related.length >= Math.min(limit, 2)) return related;
    }
  } catch {
    // fall through to DB
  }
  return getRelatedProducts(category, excludeId, limit);
}

export async function getProductsByBrand(brandName: string): Promise<Product[]> {
  const insforge = createInsforgeServer();
  const { data, error } = await insforge.database
    .from("products")
    .select("*")
    .ilike("brand_name", brandName);
  if (error || !data) return [];
  return (data as ProductRow[]).map(rowToKoi);
}
