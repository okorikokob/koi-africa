import { createInsforgeServer } from "@/lib/insforge-server";
import type { Product, ProductVariant } from "@/types";

type CatalogImageRow = {
  official_cdn_url: string;
  position: number;
  color_name: string | null;
};

type CatalogVariantRow = {
  id: string;
  source_variant_id: string;
  sku: string | null;
  gtin: string | null;
  color_name: string | null;
  size_label: string | null;
  currency: string;
  price_minor: number | string | null;
  sale_price_minor: number | string | null;
  available: boolean;
  is_active: boolean;
  option_values: Record<string, string> | null;
  availability_status: "in_stock" | "pre_order" | "out_of_stock";
};

type CatalogProductRow = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  product_type: string | null;
  canonical_url: string;
  currency: string;
  price_minor: number | string;
  sale_price_minor: number | string | null;
  available: boolean;
  availability_status: "in_stock" | "pre_order" | "out_of_stock";
  rating: number | string | null;
  review_count: number;
  catalog_storefronts: {
    country_code: string;
    catalog_brands: { name: string; slug: string };
  };
  catalog_product_images: CatalogImageRow[];
  catalog_product_variants: CatalogVariantRow[];
};

function minorToMajor(value: number | string | null): number {
  if (value == null) return 0;
  return Number(value) / 100;
}

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function rowToProduct(row: CatalogProductRow): Product {
  const images = [...row.catalog_product_images].sort((a, b) => a.position - b.position);
  const activeVariants = row.catalog_product_variants.filter((variant) => variant.is_active);
  const productPrice = minorToMajor(row.sale_price_minor ?? row.price_minor);
  const colorImageSets: Record<string, string[]> = {};
  for (const image of images) {
    if (!image.color_name) continue;
    colorImageSets[image.color_name] = [...(colorImageSets[image.color_name] ?? []), image.official_cdn_url];
  }
  const colorImages = Object.fromEntries(Object.entries(colorImageSets).map(([color, urls]) => [color, urls[0]]));
  const variants: ProductVariant[] = activeVariants.map((variant) => ({
    id: variant.source_variant_id,
    sku: variant.sku ?? undefined,
    gtin: variant.gtin ?? undefined,
    checkoutUrl: row.canonical_url,
    productUrl: row.canonical_url,
    available: variant.available,
    availabilityStatus: variant.availability_status,
    price: minorToMajor(variant.sale_price_minor ?? variant.price_minor) || productPrice,
    currency: variant.currency,
    options: Object.keys(variant.option_values ?? {}).length
      ? Object.entries(variant.option_values!).map(([name, label]) => ({ name, label }))
      : [
          ...(variant.color_name ? [{ name: "Colour", label: variant.color_name }] : []),
          ...(variant.size_label ? [{ name: "Size", label: variant.size_label }] : []),
        ],
    imageUrl: images[0]?.official_cdn_url ?? "",
  }));
  const optionNames = unique(variants.flatMap((variant) => variant.options.map((option) => option.name)));

  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    brandName: row.catalog_storefronts.catalog_brands.name,
    category: row.product_type ?? "catalogue",
    imageUrl: images[0]?.official_cdn_url ?? "",
    allImages: images.map((image) => image.official_cdn_url),
    colorImages,
    colorImageSets,
    priceAmount: productPrice,
    priceCurrency: row.currency,
    vendorName: row.catalog_storefronts.catalog_brands.name,
    vendorUrl: row.canonical_url,
    productPageUrl: row.canonical_url,
    description: row.description ?? undefined,
    isFeatured: false,
    available: row.available,
    availabilityStatus: row.availability_status,
    rating: row.rating == null ? undefined : Number(row.rating),
    reviewCount: row.review_count,
    variants,
    options: optionNames.map((name) => ({
      name,
      values: unique(variants.flatMap((variant) => variant.options.filter((option) => option.name === name).map((option) => option.label))),
    })),
    source: row.catalog_storefronts.country_code === "UK" ? "UK" : "US",
  };
}

const CATALOG_SELECT = `
  id,title,subtitle,description,product_type,canonical_url,currency,price_minor,sale_price_minor,available,availability_status,rating,review_count,
  catalog_storefronts!inner(country_code,catalog_brands!inner(name,slug)),
  catalog_product_images(official_cdn_url,position,color_name),
  catalog_product_variants(id,source_variant_id,sku,gtin,color_name,size_label,currency,price_minor,sale_price_minor,available,is_active,option_values,availability_status)
`;

async function runCatalogQuery(limit?: number): Promise<Product[]> {
  const insforge = createInsforgeServer();
  let query = insforge.database
    .from("catalog_products")
    .select(CATALOG_SELECT)
    .eq("is_active", true)
    .order("last_synced_at", { ascending: false });
  if (limit != null) query = query.limit(limit);
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as unknown as CatalogProductRow[]).map(rowToProduct);
}

export async function getCatalogV2Products(): Promise<Product[]> {
  return runCatalogQuery();
}

export async function getCatalogV2FeaturedProducts(limit: number): Promise<Product[]> {
  return runCatalogQuery(limit);
}

export async function getCatalogV2ProductById(id: string): Promise<Product | null> {
  const products = await runCatalogQuery();
  return products.find((product) => product.id === id) ?? null;
}

export async function getCatalogV2ProductsByBrand(brandName: string): Promise<Product[]> {
  const products = await runCatalogQuery();
  return products.filter((product) => product.brandName.toLowerCase() === brandName.toLowerCase());
}
