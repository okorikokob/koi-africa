import { createInsforgeServer } from "@/lib/insforge-server";
import { rowToKoi, type ProductRow } from "@/lib/product-db";
import type { Brand, Product } from "@/types";

export type ProductListResult = {
  products: Product[];
  total: number;
};

export type ProductListOptions = {
  categories?: string[];
  page?: number;
  pageSize?: number;
};

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

export async function searchProducts(searchTerm: string, limit = 40): Promise<Product[]> {
  const insforge = createInsforgeServer();
  const term = searchTerm.replace(/[(),.]/g, " ").replace(/[%_]/g, "\\$&");
  const { data, error } = await insforge.database
    .from("products")
    .select("*")
    .or(`title.ilike.%${term}%,brand_name.ilike.%${term}%`)
    .limit(limit);
  if (error || !data) return [];
  return (data as ProductRow[]).map(rowToKoi);
}

export async function getCategoryFacets(): Promise<string[]> {
  const insforge = createInsforgeServer();
  const { data, error } = await insforge.database
    .from("products")
    .select("category");
  if (error || !data) return [];
  const set = new Set(
    (data as Array<{ category: string | null }>)
      .map((row) => row.category)
      .filter((category): category is string => Boolean(category)),
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

export async function getRelatedProductsForTitle(
  _title: string,
  category: string,
  excludeId: string,
  limit = 4,
): Promise<Product[]> {
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

export async function getBrandCatalog(brandName: string, _category: string): Promise<Product[]> {
  void _category;
  return getProductsByBrand(brandName);
}

export type BrandSummary = {
  brand: Brand;
  productCount: number;
  imageUrl: string | null;
};

export async function getBrandSummaries(brands: Brand[]): Promise<BrandSummary[]> {
  return Promise.all(
    brands.map(async (brand) => {
      const products = await getProductsByBrand(brand.name);
      return {
        brand,
        productCount: products.length,
        imageUrl: products[0]?.imageUrl ?? null,
      };
    }),
  );
}
