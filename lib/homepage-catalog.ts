import type { Brand, Product } from "@/types";

export const HOMEPAGE_DEMO_BRAND_ORDER = ["nike", "hm", "sephora"] as const;

export function getEnabledHomepageDemoBrands(
  environment: Record<string, string | undefined> = process.env,
): string[] {
  return HOMEPAGE_DEMO_BRAND_ORDER.filter((slug) => {
    if (slug === "nike") return environment.USE_LOCAL_NIKE_CATALOG === "true";
    if (slug === "hm") return environment.USE_LOCAL_HM_CATALOG === "true";
    return environment.USE_LOCAL_SEPHORA_CATALOG === "true";
  });
}

export function prioritizeHomepageBrands(brands: Brand[], enabledSlugs: string[]): Brand[] {
  const priority = new Map(enabledSlugs.map((slug, index) => [slug, index]));
  return [...brands].sort((left, right) => {
    const leftPriority = priority.get(left.slug);
    const rightPriority = priority.get(right.slug);
    if (leftPriority == null && rightPriority == null) return 0;
    if (leftPriority == null) return 1;
    if (rightPriority == null) return -1;
    return leftPriority - rightPriority;
  });
}

function productProviderSlug(product: Product): string {
  const provider = product.vendorName.toLowerCase();
  if (provider === "h&m") return "hm";
  return provider;
}

export function prioritizeHomepageProducts(
  products: Product[],
  enabledSlugs: string[],
  limit: number,
): Product[] {
  const prioritized = enabledSlugs.flatMap((slug) => {
    const product = products.find((candidate) => productProviderSlug(candidate) === slug);
    return product ? [product] : [];
  });
  const prioritizedIds = new Set(prioritized.map((product) => product.id));
  return [...prioritized, ...products.filter((product) => !prioritizedIds.has(product.id))].slice(0, limit);
}
