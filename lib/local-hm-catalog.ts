import fixture from "@/data/hm-demo-catalog.json";
import type { Product } from "@/types";

type FixtureImage = {
  official_cdn_url: string;
  position: number;
};

type FixtureProduct = {
  sourceProductId: string;
  product: {
    canonical_url: string;
    title: string;
    description: string | null;
    product_type: string | null;
    color_name: string | null;
    currency: string;
    price_minor: number;
    original_price_minor: number | null;
    availability_status: "in_stock" | "out_of_stock";
    available: boolean;
  };
  images: FixtureImage[];
  variants: unknown[];
};

function toProduct(entry: FixtureProduct): Product {
  const images = [...entry.images]
    .sort((a, b) => a.position - b.position)
    .map((image) => image.official_cdn_url);
  const priceAmount = entry.product.price_minor / 100;
  const originalPrice = entry.product.original_price_minor == null ? undefined : entry.product.original_price_minor / 100;

  return {
    id: `local-hm-${entry.sourceProductId}`,
    title: entry.product.title,
    subtitle: entry.product.color_name ?? undefined,
    brandName: "H&M",
    category: entry.product.product_type ?? "H&M",
    imageUrl: images[0] ?? "",
    allImages: images,
    priceAmount,
    compareAtPriceAmount: originalPrice && originalPrice > priceAmount ? originalPrice : undefined,
    priceCurrency: entry.product.currency,
    vendorName: "H&M",
    vendorUrl: entry.product.canonical_url,
    productPageUrl: entry.product.canonical_url,
    description: entry.product.description ?? undefined,
    colorName: entry.product.color_name ?? undefined,
    isFeatured: false,
    available: entry.product.available,
    availabilityStatus: entry.product.availability_status,
    variants: [],
    options: [],
    source: "US",
  };
}

const products = (fixture.products as FixtureProduct[]).map(toProduct);

export function getLocalHmProducts(): Product[] {
  return process.env.USE_LOCAL_HM_CATALOG === "true" ? products : [];
}

export function getLocalHmProductById(id: string): Product | null {
  if (process.env.USE_LOCAL_HM_CATALOG !== "true") return null;
  return products.find((product) => product.id === id) ?? null;
}
