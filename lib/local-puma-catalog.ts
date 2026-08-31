import fixture from "@/data/puma-checkout-safe-catalog.json";
import type { Channel3PumaFixture, Channel3PumaFixtureProduct } from "@/lib/channel3-puma-types";
import type { Product, ProductVariant } from "@/types";

function toProduct(entry: Channel3PumaFixtureProduct): Product {
  const images = [...entry.images].sort((a, b) => a.position - b.position);
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
    options: Object.entries(variant.option_values).map(([name, label]) => ({ name, label })),
    imageUrl: images[0]?.official_cdn_url ?? "",
  }));
  const optionNames = [...new Set(variants.flatMap((variant) => variant.options.map((option) => option.name)))];

  return {
    id: `local-channel3-${entry.sourceProductId}`,
    title: entry.product.title,
    subtitle: entry.product.subtitle ?? undefined,
    brandName: "Puma",
    category: entry.product.product_type ?? "Puma",
    imageUrl: images[0]?.official_cdn_url ?? "",
    allImages: images.map((image) => image.official_cdn_url),
    priceAmount: productPrice,
    compareAtPriceAmount: entry.product.sale_price_minor == null ? undefined : entry.product.price_minor / 100,
    priceCurrency: entry.product.currency,
    vendorName: "Puma",
    vendorUrl: entry.product.canonical_url,
    productPageUrl: entry.product.canonical_url,
    description: entry.product.description ?? undefined,
    isFeatured: false,
    available: entry.product.available,
    availabilityStatus: entry.product.availability_status,
    variants,
    requiresVariantSelection: variants.length > 0,
    options: optionNames.map((name) => ({
      name,
      values: [...new Set(variants.flatMap((variant) => variant.options
        .filter((option) => option.name === name)
        .map((option) => option.label)))],
    })),
    source: "US",
  };
}

const pumaFixture = fixture as Channel3PumaFixture;
const products = pumaFixture.products.map(toProduct);

export function getLocalPumaProducts(): Product[] {
  return process.env.USE_LOCAL_PUMA_CATALOG === "true" ? products : [];
}

export function getLocalPumaProductById(id: string): Product | null {
  if (process.env.USE_LOCAL_PUMA_CATALOG !== "true") return null;
  return products.find((product) => product.id === id) ?? null;
}
