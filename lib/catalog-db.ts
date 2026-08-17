import { createInsforgeServer } from "@/lib/insforge-server";
import { rowToKoi, type ProductRow } from "@/lib/product-db";
import {
  getCatalogV2ProductById,
  getCatalogV2Products,
  getCatalogV2ProductsByBrand,
} from "@/lib/catalog-v2-db";
import type { Brand, Product } from "@/types";
import { getLocalNikeProductById, getLocalNikeProducts } from "@/lib/local-nike-catalog";

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
  const catalogProducts = await getCatalogV2Products();
  const localNikeProducts = getLocalNikeProducts();
  const insforge = createInsforgeServer();
  let query = insforge.database
    .from("products")
    .select("*")
    .order("is_featured", { ascending: false })
    .order("synced_at", { ascending: false });

  if (categories.length > 0) {
    query = query.in("category", categories);
  }

  const { data } = await query;
  const legacyProducts = (data as ProductRow[] | null)?.map(rowToKoi) ?? [];
  const merged = [...localNikeProducts, ...catalogProducts, ...legacyProducts];
  const filtered = categories.length > 0 ? merged.filter((product) => categories.includes(product.category)) : merged;
  const from = (page - 1) * pageSize;
  return { products: filtered.slice(from, from + pageSize), total: filtered.length };
}

export async function searchProducts(searchTerm: string, limit = 40): Promise<Product[]> {
  const catalogProducts = await getCatalogV2Products();
  const localNikeProducts = getLocalNikeProducts();
  const insforge = createInsforgeServer();
  const term = searchTerm.replace(/[(),.]/g, " ").replace(/[%_]/g, "\\$&");
  const { data, error } = await insforge.database
    .from("products")
    .select("*")
    .or(`title.ilike.%${term}%,brand_name.ilike.%${term}%`)
    .limit(limit);
  const legacy = error || !data ? [] : (data as ProductRow[]).map(rowToKoi);
  const normalizedTerm = searchTerm.toLowerCase();
  const localAndV2 = [...localNikeProducts, ...catalogProducts].filter((product) => product.title.toLowerCase().includes(normalizedTerm) || product.brandName.toLowerCase().includes(normalizedTerm));
  return [...localAndV2, ...legacy].slice(0, limit);
}

export async function getCategoryFacets(): Promise<string[]> {
  const catalogProducts = await getCatalogV2Products();
  const localNikeProducts = getLocalNikeProducts();
  const insforge = createInsforgeServer();
  const { data, error } = await insforge.database
    .from("products")
    .select("category");
  const set = new Set([...localNikeProducts, ...catalogProducts].map((product) => product.category));
  if (!error && data) for (const category of
    (data as Array<{ category: string | null }>)
      .map((row) => row.category)
      .filter((category): category is string => Boolean(category))) set.add(category);
  return Array.from(set).sort();
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const catalogProducts = await getCatalogV2Products();
  const localNikeProducts = getLocalNikeProducts();
  const insforge = createInsforgeServer();
  const { data, error } = await insforge.database
    .from("products")
    .select("*")
    .eq("is_featured", true)
    .limit(limit);
  const legacy = error || !data ? [] : (data as ProductRow[]).map(rowToKoi);
  return [...catalogProducts, ...legacy, ...localNikeProducts].slice(0, limit);
}

export async function getProductById(id: string): Promise<Product | null> {
  const localProduct = getLocalNikeProductById(id);
  if (localProduct) return localProduct;
  const catalogProduct = await getCatalogV2ProductById(id);
  if (catalogProduct) return catalogProduct;

  const insforge = createInsforgeServer();
  const { data, error } = await insforge.database
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return rowToKoi(data as ProductRow);
}

export async function getCatalogProductById(id: string): Promise<Product | null> {
  const localProduct = getLocalNikeProductById(id);
  if (localProduct) return localProduct;
  const catalogProduct = await getCatalogV2ProductById(id);
  if (catalogProduct) return catalogProduct;
  return getProductById(id);
}

export async function getRelatedProducts(
  category: string,
  excludeId: string,
  limit = 4,
): Promise<Product[]> {
  const catalogProducts = await getCatalogV2Products();
  const localNikeProducts = getLocalNikeProducts();
  const insforge = createInsforgeServer();
  const { data, error } = await insforge.database
    .from("products")
    .select("*")
    .eq("category", category)
    .neq("id", excludeId)
    .limit(limit);
  const legacy = error || !data ? [] : (data as ProductRow[]).map(rowToKoi);
  return [...localNikeProducts, ...catalogProducts]
    .filter((product) => product.category === category && product.id !== excludeId)
    .concat(legacy)
    .slice(0, limit);
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
  const catalogProducts = await getCatalogV2ProductsByBrand(brandName);
  const localProducts = getLocalNikeProducts().filter((product) => product.brandName.toLowerCase() === brandName.toLowerCase());

  const insforge = createInsforgeServer();
  const { data, error } = await insforge.database
    .from("products")
    .select("*")
    .ilike("brand_name", brandName);
  const legacy = error || !data ? [] : (data as ProductRow[]).map(rowToKoi);
  return [...localProducts, ...catalogProducts, ...legacy];
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
