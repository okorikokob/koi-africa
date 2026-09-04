import { createInsforgeServer } from "@/lib/insforge-server";
import { rowToKoi, type ProductRow } from "@/lib/product-db";
import {
  getCatalogV2ProductById,
  getCatalogV2Products,
  getCatalogV2ProductsByBrand,
} from "@/lib/catalog-v2-db";
import type { Brand, Product } from "@/types";
import { getLocalCatalogProductById, getLocalCatalogProducts, getLocalCatalogProductsByBrand } from "@/lib/local-catalog";
import { nikePostgresReadsEnabled } from "@/lib/catalog-feature-flags";
import {
  filterPublicStorefrontProducts,
  isPubliclyShoppableBrand,
} from "@/lib/public-storefront-policy";

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
  const publicProducts = await getProductsByBrand("Nike");
  const filtered = categories.length > 0 ? publicProducts.filter((product) => categories.includes(product.category)) : publicProducts;
  const from = (page - 1) * pageSize;
  return { products: filtered.slice(from, from + pageSize), total: filtered.length };
}

export async function searchProducts(searchTerm: string, limit = 40): Promise<Product[]> {
  const normalizedTerm = searchTerm.toLowerCase();
  return (await getProductsByBrand("Nike"))
    .filter((product) => (
      product.title.toLowerCase().includes(normalizedTerm)
      || product.brandName.toLowerCase().includes(normalizedTerm)
    ))
    .slice(0, limit);
}

export async function getCategoryFacets(): Promise<string[]> {
  const publicProducts = await getProductsByBrand("Nike");
  const set = new Set(publicProducts.map((product) => product.category));
  return Array.from(set).sort();
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  return (await getProductsByBrand("Nike")).slice(0, limit);
}

export async function getProductById(id: string): Promise<Product | null> {
  const localProduct = getLocalCatalogProductById(id);
  if (localProduct && isPubliclyShoppableBrand(localProduct.brandName)) return localProduct;
  const catalogProduct = await getCatalogV2ProductById(id);
  if (catalogProduct && isPubliclyShoppableBrand(catalogProduct.brandName)) return catalogProduct;

  const insforge = createInsforgeServer();
  const { data, error } = await insforge.database
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const product = rowToKoi(data as ProductRow);
  return isPubliclyShoppableBrand(product.brandName) ? product : null;
}

export async function getCatalogProductById(id: string): Promise<Product | null> {
  if (nikePostgresReadsEnabled()) {
    const { getNikePostgresProductById } = await import("@/lib/nike-postgres-catalog");
    const postgresNikeProduct = await getNikePostgresProductById(id);
    if (postgresNikeProduct && isPubliclyShoppableBrand(postgresNikeProduct.brandName)) return postgresNikeProduct;
  }
  const localProduct = getLocalCatalogProductById(id);
  if (localProduct && isPubliclyShoppableBrand(localProduct.brandName)) return localProduct;
  const catalogProduct = await getCatalogV2ProductById(id);
  if (catalogProduct && isPubliclyShoppableBrand(catalogProduct.brandName)) return catalogProduct;
  return getProductById(id);
}

export async function getRelatedProducts(
  category: string,
  excludeId: string,
  limit = 4,
): Promise<Product[]> {
  const localNikeProducts = getLocalCatalogProducts();
  if (excludeId.startsWith("local-")) {
    return filterPublicStorefrontProducts(localNikeProducts)
      .filter((product) => product.category === category && product.id !== excludeId)
      .slice(0, limit);
  }
  const catalogProducts = await getCatalogV2Products();
  const insforge = createInsforgeServer();
  const { data, error } = await insforge.database
    .from("products")
    .select("*")
    .eq("category", category)
    .neq("id", excludeId)
    .limit(limit);
  const legacy = error || !data ? [] : (data as ProductRow[]).map(rowToKoi);
  return filterPublicStorefrontProducts([...localNikeProducts, ...catalogProducts, ...legacy])
    .filter((product) => product.category === category && product.id !== excludeId)
    .slice(0, limit);
}

export async function getRelatedProductsForTitle(
  _title: string,
  category: string,
  excludeId: string,
  limit = 4,
): Promise<Product[]> {
  if (nikePostgresReadsEnabled()) {
    const { getNikePostgresProductById, getNikePostgresProducts } = await import("@/lib/nike-postgres-catalog");
    const postgresNikeProduct = await getNikePostgresProductById(excludeId);
    if (postgresNikeProduct) {
      return (await getNikePostgresProducts())
        .filter((product) => product.category === category && product.id !== excludeId)
        .slice(0, limit);
    }
  }
  return getRelatedProducts(category, excludeId, limit);
}

export async function getProductsByBrand(brandName: string): Promise<Product[]> {
  if (!isPubliclyShoppableBrand(brandName)) return [];
  if (brandName.toLowerCase() === "nike" && nikePostgresReadsEnabled()) {
    const { getNikePostgresProducts } = await import("@/lib/nike-postgres-catalog");
    return getNikePostgresProducts();
  }
  const localProducts = getLocalCatalogProductsByBrand(brandName);
  if (["nike", "h&m", "sephora", "puma"].includes(brandName.toLowerCase()) && localProducts.length > 0) return localProducts;

  const catalogProducts = await getCatalogV2ProductsByBrand(brandName);

  const insforge = createInsforgeServer();
  const { data, error } = await insforge.database
    .from("products")
    .select("*")
    .ilike("brand_name", brandName);
  const legacy = error || !data ? [] : (data as ProductRow[]).map(rowToKoi);
  return filterPublicStorefrontProducts([...localProducts, ...catalogProducts, ...legacy]);
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
