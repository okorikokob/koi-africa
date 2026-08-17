export type ProductVariant = {
  id: string;
  sku?: string;
  gtin?: string;
  checkoutUrl: string;
  productUrl: string;
  available: boolean;
  availabilityStatus?: "in_stock" | "pre_order" | "out_of_stock";
  price: number;
  currency: string;
  options: Array<{ name: string; label: string }>;
  imageUrl: string;
};

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
  subtitle?: string;
  brandName: string;
  category: string;
  imageUrl: string;
  priceAmount: number;
  compareAtPriceAmount?: number;
  priceCurrency: string;
  vendorName: string;
  vendorUrl: string;
  isFeatured: boolean;
  description?: string;
  colorName?: string;
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
  available?: boolean;
  availabilityStatus?: "in_stock" | "pre_order" | "out_of_stock";
};

export type CategoryTile = {
  slug: string;
  name: string;
  imageUrl: string;
};
