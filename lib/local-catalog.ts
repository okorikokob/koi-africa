import { getLocalHmProductById, getLocalHmProducts } from "@/lib/local-hm-catalog";
import { getLocalNikeProductById, getLocalNikeProducts } from "@/lib/local-nike-catalog";
import { getLocalSephoraProductById, getLocalSephoraProducts } from "@/lib/local-sephora-catalog";
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

const SEPHORA_BRAND: Brand = {
  id: "brand-sephora-local",
  name: "Sephora",
  slug: "sephora",
  logoUrl: "",
  description: "Beauty, skincare, fragrance and makeup from Sephora US.",
  category: "Beauty",
  isFeatured: false,
};

export function getLocalCatalogProducts(): Product[] {
  return [...getLocalNikeProducts(), ...getLocalHmProducts(), ...getLocalSephoraProducts()];
}

export function getLocalCatalogProductById(id: string): Product | null {
  return getLocalNikeProductById(id) ?? getLocalHmProductById(id) ?? getLocalSephoraProductById(id);
}

export function getLocalCatalogBrands(): Brand[] {
  return [
    ...(process.env.USE_LOCAL_HM_CATALOG === "true" ? [HM_BRAND] : []),
    ...(process.env.USE_LOCAL_SEPHORA_CATALOG === "true" ? [SEPHORA_BRAND] : []),
  ];
}

export function getLocalCatalogProductsByBrand(brandName: string): Product[] {
  if (brandName.toLowerCase() === "sephora") return getLocalSephoraProducts();
  return getLocalCatalogProducts().filter((product) => product.brandName.toLowerCase() === brandName.toLowerCase());
}
