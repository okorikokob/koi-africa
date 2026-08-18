import fixture from "@/data/sephora-demo-catalog.json";
import type { Product, ProductVariant } from "@/types";

type FixtureImage = { official_cdn_url: string; position: number; color_name: string | null };
type FixtureVariant = {
  source_variant_id: string;
  source_item_id: string;
  sku: string;
  option_values: Record<string, string>;
  currency: string;
  price_minor: number;
  sale_price_minor: number | null;
  availability_status: "in_stock" | "pre_order" | "out_of_stock";
  available: boolean;
  product_url: string;
  image_url: string;
};
type FixtureProduct = {
  sourceProductId: string;
  product: {
    canonical_url: string;
    title: string;
    actual_brand_name: string;
    description: string | null;
    product_type: string | null;
    currency: string;
    price_minor: number;
    sale_price_minor: number | null;
    rating: number | null;
    review_count: number;
    availability_status: "in_stock" | "pre_order" | "out_of_stock";
    available: boolean;
  };
  images: FixtureImage[];
  variants: FixtureVariant[];
};

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toProduct(entry: FixtureProduct): Product {
  const images = [...entry.images].sort((a, b) => a.position - b.position);
  const colorImageSets: Record<string, string[]> = {};
  for (const image of images) {
    if (!image.color_name) continue;
    colorImageSets[image.color_name] = [...(colorImageSets[image.color_name] ?? []), image.official_cdn_url];
  }
  const colorImages = Object.fromEntries(Object.entries(colorImageSets).map(([color, urls]) => [color, urls[0]]));
  const variants: ProductVariant[] = entry.variants.map((variant) => ({
    id: variant.source_variant_id,
    sku: variant.source_item_id || variant.sku,
    checkoutUrl: variant.product_url,
    productUrl: variant.product_url,
    available: variant.available,
    availabilityStatus: variant.availability_status,
    price: (variant.sale_price_minor ?? variant.price_minor) / 100,
    currency: variant.currency,
    options: Object.entries(variant.option_values).map(([name, label]) => ({ name: titleCase(name), label })),
    imageUrl: colorImages[variant.option_values.color] ?? variant.image_url ?? images[0]?.official_cdn_url ?? "",
  }));
  const optionNames = [...new Set(variants.flatMap((variant) => variant.options.map((option) => option.name)))];
  const colors = [...new Set(variants.flatMap((variant) => variant.options.filter((option) => option.name === "Color").map((option) => option.label)))];

  return {
    id: `local-sephora-${entry.sourceProductId}`,
    title: entry.product.title,
    brandName: entry.product.actual_brand_name,
    category: entry.product.product_type ?? "Beauty",
    imageUrl: images[0]?.official_cdn_url ?? "",
    allImages: images.map((image) => image.official_cdn_url),
    colorImages,
    colorImageSets,
    priceAmount: (entry.product.sale_price_minor ?? entry.product.price_minor) / 100,
    priceCurrency: entry.product.currency,
    vendorName: "Sephora",
    vendorUrl: entry.product.canonical_url,
    productPageUrl: entry.product.canonical_url,
    description: entry.product.description ?? undefined,
    colorName: colors.length === 1 ? colors[0] : undefined,
    rating: entry.product.rating ?? undefined,
    reviewCount: entry.product.review_count,
    isFeatured: false,
    available: entry.product.available,
    availabilityStatus: entry.product.availability_status,
    variants,
    requiresVariantSelection: variants.length > 0,
    options: optionNames.map((name) => ({
      name,
      values: [...new Set(variants.flatMap((variant) => variant.options.filter((option) => option.name === name).map((option) => option.label)))],
    })),
    source: "US",
  };
}

const products = (fixture.products as FixtureProduct[]).map(toProduct);

export function getLocalSephoraProducts(): Product[] {
  return process.env.USE_LOCAL_SEPHORA_CATALOG === "true" ? products : [];
}

export function getLocalSephoraProductById(id: string): Product | null {
  if (process.env.USE_LOCAL_SEPHORA_CATALOG !== "true") return null;
  return products.find((product) => product.id === id) ?? null;
}
