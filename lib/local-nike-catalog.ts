import fixture from "@/data/nike-demo-catalog.json";
import type { Product, ProductVariant } from "@/types";

type FixtureImage = {
  official_cdn_url: string;
  position: number;
  color_name: string | null;
};

type FixtureVariant = {
  source_variant_id: string;
  sku: string | null;
  gtin: string | null;
  option_values: Record<string, string>;
  currency: string;
  price_minor: number;
  sale_price_minor: number | null;
  availability_status: "in_stock" | "pre_order" | "out_of_stock";
  available: boolean;
};

type FixtureProduct = {
  sourceProductId: string;
  product: {
    canonical_url: string;
    title: string;
    subtitle: string | null;
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
  const productPrice = (entry.product.sale_price_minor ?? entry.product.price_minor) / 100;
  const variants: ProductVariant[] = entry.variants.map((variant) => ({
    id: variant.source_variant_id,
    sku: variant.sku ?? undefined,
    gtin: variant.gtin ?? undefined,
    checkoutUrl: entry.product.canonical_url,
    productUrl: entry.product.canonical_url,
    available: variant.available,
    availabilityStatus: variant.availability_status,
    price: (variant.sale_price_minor ?? variant.price_minor) / 100,
    currency: variant.currency,
    options: Object.entries(variant.option_values).map(([name, label]) => ({ name: titleCase(name), label })),
    imageUrl: colorImages[variant.option_values.color] ?? images[0]?.official_cdn_url ?? "",
  }));
  const optionNames = [...new Set(variants.flatMap((variant) => variant.options.map((option) => option.name)))];

  return {
    id: `local-nike-${entry.sourceProductId}`,
    title: entry.product.title,
    subtitle: entry.product.subtitle ?? undefined,
    brandName: "Nike",
    category: entry.product.product_type ?? "Nike",
    imageUrl: images[0]?.official_cdn_url ?? "",
    allImages: images.map((image) => image.official_cdn_url),
    colorImages,
    colorImageSets,
    priceAmount: productPrice,
    compareAtPriceAmount: entry.product.sale_price_minor == null ? undefined : entry.product.price_minor / 100,
    priceCurrency: entry.product.currency,
    vendorName: "Nike",
    vendorUrl: entry.product.canonical_url,
    productPageUrl: entry.product.canonical_url,
    description: entry.product.description ?? undefined,
    rating: entry.product.rating ?? undefined,
    reviewCount: entry.product.review_count,
    isFeatured: false,
    available: entry.product.available,
    availabilityStatus: entry.product.availability_status,
    variants,
    options: optionNames.map((name) => ({
      name,
      values: [...new Set(variants.flatMap((variant) => variant.options.filter((option) => option.name === name).map((option) => option.label)))],
    })),
    source: "US",
  };
}

const products = (fixture.products as FixtureProduct[]).map(toProduct);

export function getLocalNikeProducts(): Product[] {
  return process.env.USE_LOCAL_NIKE_CATALOG === "true" ? products : [];
}

export function getLocalNikeProductById(id: string): Product | null {
  if (process.env.USE_LOCAL_NIKE_CATALOG !== "true") return null;
  return products.find((product) => product.id === id) ?? null;
}
