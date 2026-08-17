import { getLocalHmProductById, getLocalHmProducts } from "@/lib/local-hm-catalog";
import { getLocalNikeProductById, getLocalNikeProducts } from "@/lib/local-nike-catalog";
import type { Brand, Product } from "@/types";

const HM_BRAND: Brand = {
  id: "brand-hm-local",
  name: "H&M",
  slug: "hm",
  logoUrl: "",
  description: "Current fashion, everyday essentials and new arrivals from H&M US.",
  category: "Fashion",
  isFeatured: false,
};

export function getLocalCatalogProducts(): Product[] {
  return [...getLocalNikeProducts(), ...getLocalHmProducts()];
}

export function getLocalCatalogProductById(id: string): Product | null {
  return getLocalNikeProductById(id) ?? getLocalHmProductById(id);
}

export function getLocalCatalogBrands(): Brand[] {
  return process.env.USE_LOCAL_HM_CATALOG === "true" ? [HM_BRAND] : [];
}
