export type ProductVariant = {
  id: string;
  styleColor?: string;
  sku?: string;
  gtin?: string;
  checkoutUrl: string;
  productUrl: string;
  available: boolean;
  availabilityStatus?: "in_stock" | "limited" | "pre_order" | "out_of_stock" | "unknown";
  price: number;
  currency: string;
  options: Array<{ name: string; label: string }>;
  imageUrl: string;
};

export type ProductColourway = {
  styleColor: string;
  colour: string;
  canonicalUrl: string;
  primaryImage: string;
  images: string[];
  priceAmount: number;
  compareAtPriceAmount?: number;
  priceCurrency: string;
  available: boolean;
  availabilityStatus: "in_stock" | "limited" | "pre_order" | "out_of_stock" | "unknown";
  variantIds: string[];
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
  colourways?: ProductColourway[];
  requiresVariantSelection?: boolean;
  options?: Array<{ name: string; values: string[] }>;
  tag?: "new" | "bestseller";
  source?: "UK" | "US";
  available?: boolean;
  availabilityStatus?: "in_stock" | "limited" | "pre_order" | "out_of_stock" | "unknown";
};

export type CategoryTile = {
  slug: string;
  name: string;
  imageUrl: string;
};
