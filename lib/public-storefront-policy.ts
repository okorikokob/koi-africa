import type { Brand, Product } from "@/types";

const PUBLICLY_SHOPPABLE_BRAND_SLUGS = ["nike"] as const;
const HIDDEN_PUBLIC_BRAND_SLUGS = ["hm", "h-m", "h-and-m", "sephora"] as const;

function normalizeBrandIdentity(value: string): string {
  return value.trim().toLowerCase().replace("&", "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function isPubliclyShoppableBrand(value: string): boolean {
  return PUBLICLY_SHOPPABLE_BRAND_SLUGS.includes(
    normalizeBrandIdentity(value) as (typeof PUBLICLY_SHOPPABLE_BRAND_SLUGS)[number],
  );
}

export function isHiddenPublicBrand(value: string): boolean {
  const normalized = normalizeBrandIdentity(value);
  return HIDDEN_PUBLIC_BRAND_SLUGS.includes(
    normalized as (typeof HIDDEN_PUBLIC_BRAND_SLUGS)[number],
  ) || normalized === "handm";
}

export function filterPublicStorefrontProducts(products: Product[]): Product[] {
  return products.filter((product) => isPubliclyShoppableBrand(product.brandName));
}

export function partitionMarketplaceBrands(brands: Brand[]): {
  available: Brand[];
  comingSoon: Brand[];
} {
  const unique = [...new Map(brands.map((brand) => [brand.slug, brand])).values()];
  return {
    available: unique.filter((brand) => isPubliclyShoppableBrand(brand.slug)),
    comingSoon: unique.filter((brand) => (
      !isPubliclyShoppableBrand(brand.slug) && !isHiddenPublicBrand(brand.slug)
    )),
  };
}
