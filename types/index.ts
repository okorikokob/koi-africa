import type { ProductVariant } from "@/lib/shopify-catalog";

export type Brand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  description: string;
  category: string;
  isFeatured: boolean;
};

export type Product = {
  id: string;
  title: string;
  brandName: string;
  category: string;
  imageUrl: string;
  priceAmount: number;
  priceCurrency: string;
  vendorName: string;
  vendorUrl: string;
  isFeatured: boolean;
  description?: string;
  allImages?: string[];
  colorImages?: Record<string, string>;
  colorImageSets?: Record<string, string[]>;
  productPageUrl?: string;
  rating?: number;
  reviewCount?: number;
  variants?: ProductVariant[];
  options?: Array<{ name: string; values: string[] }>;
  tag?: "new" | "bestseller";
  source?: "UK" | "US";
};

export type CategoryTile = {
  slug: string;
  name: string;
  imageUrl: string;
};
