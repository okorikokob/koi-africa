import type { ApifyNikeProductRecord } from "@/lib/catalog-ingestion-schema";

export type NikeAvailabilityStatus = "in_stock" | "limited" | "out_of_stock" | "unknown";

export type NormalizedNikeProduct = {
  sourceProductId: string;
  product: {
    style_code: string | null;
    canonical_url: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    product_type: string | null;
    department: null;
    gender: string | null;
    currency: string;
    price_minor: number;
    sale_price_minor: number | null;
    availability_status: NikeAvailabilityStatus;
    available: boolean;
    source_updated_at: string | null;
  };
  colourways: Array<{
    style_color: string;
    colour: string;
    canonical_url: string;
    currency: string;
    price_minor: number;
    sale_price_minor: number | null;
    availability_status: NikeAvailabilityStatus;
    available: boolean;
    primary_image_url: string;
    position: number;
    source_updated_at: string | null;
  }>;
  images: Array<{
    official_cdn_url: string;
    alt_text: string | null;
    position: number;
    color_name: string | null;
    style_color: string | null;
    source_updated_at: string | null;
  }>;
  variants: Array<{
    source_variant_id: string;
    sku: string | null;
    gtin: string | null;
    title: null;
    color_name: string | null;
    color_code: string | null;
    style_color: string | null;
    size_label: string | null;
    size_system: null;
    currency: string;
    price_minor: number;
    sale_price_minor: null;
    availability_status: NikeAvailabilityStatus;
    available: boolean;
    option_values: Record<string, string>;
    source_updated_at: string | null;
  }>;
};

function normalizeAvailability(value: ApifyNikeProductRecord["availability"]): NikeAvailabilityStatus {
  return value;
}

export function mapNikeProductRecord(record: ApifyNikeProductRecord): NormalizedNikeProduct {
  const currentPriceMinor = Math.round(record.currentPrice * 100);
  const originalPriceMinor = record.originalPrice == null ? null : Math.round(record.originalPrice * 100);
  const productAvailability = normalizeAvailability(record.availability);
  const variantColours = new Set(record.variants.map((variant) => variant.colour).filter(Boolean));
  const sourceGalleryColour = record.attributes?.colorDescription;
  const verifiedGalleryColour = sourceGalleryColour && variantColours.has(sourceGalleryColour)
    ? sourceGalleryColour
    : null;
  const verifiedColourways = record.colourways ?? [];
  const colourways = verifiedColourways.map((colourway, position) => {
    const currentPrice = Math.round(colourway.currentPrice * 100);
    const originalPrice = colourway.originalPrice == null ? null : Math.round(colourway.originalPrice * 100);
    const availability = normalizeAvailability(colourway.availability);
    return {
      style_color: colourway.styleColor,
      colour: colourway.colour,
      canonical_url: colourway.canonicalUrl,
      currency: colourway.currency.toUpperCase(),
      price_minor: originalPrice ?? currentPrice,
      sale_price_minor: originalPrice == null ? null : currentPrice,
      availability_status: availability,
      available: availability === "in_stock" || availability === "limited",
      primary_image_url: colourway.primaryImage,
      position,
      source_updated_at: record.scrapedAt ?? null,
    };
  });
  const images = verifiedColourways.length > 0
    ? verifiedColourways.flatMap((colourway) => colourway.images.map((image, position) => ({
        official_cdn_url: image.url,
        alt_text: image.alt ?? null,
        position,
        color_name: colourway.colour,
        style_color: colourway.styleColor,
        source_updated_at: record.scrapedAt ?? null,
      })))
    : record.images.map((image, position) => ({
        official_cdn_url: image.url,
        alt_text: image.alt ?? null,
        position,
        color_name: verifiedGalleryColour,
        style_color: null,
        source_updated_at: record.scrapedAt ?? null,
      }));
  const variants = verifiedColourways.length > 0
    ? verifiedColourways.flatMap((colourway) => colourway.variants.map((variant) => ({
        source_variant_id: variant.id,
        sku: variant.sku ?? null,
        gtin: variant.gtin ?? null,
        title: null,
        color_name: variant.colour ?? colourway.colour,
        color_code: colourway.styleColor,
        style_color: colourway.styleColor,
        size_label: variant.size ?? null,
        size_system: null,
        currency: colourway.currency.toUpperCase(),
        price_minor: Math.round((variant.currentPrice ?? colourway.currentPrice) * 100),
        sale_price_minor: null,
        availability_status: normalizeAvailability(variant.availability),
        available: ["in_stock", "limited"].includes(normalizeAvailability(variant.availability)),
        option_values: Object.fromEntries([
          ["Colour", variant.colour ?? colourway.colour] as const,
          ...(variant.size ? [["Size", variant.size] as const] : []),
        ]),
        source_updated_at: record.scrapedAt ?? null,
      })))
    : record.variants.map((variant) => ({
        source_variant_id: variant.id,
        sku: variant.sku ?? null,
        gtin: variant.gtin ?? null,
        title: null,
        color_name: variant.colour ?? null,
        color_code: null,
        style_color: null,
        size_label: variant.size ?? null,
        size_system: null,
        currency: record.currency.toUpperCase(),
        price_minor: variant.currentPrice == null ? currentPriceMinor : Math.round(variant.currentPrice * 100),
        sale_price_minor: null,
        availability_status: normalizeAvailability(variant.availability),
        available: ["in_stock", "limited"].includes(normalizeAvailability(variant.availability)),
        option_values: Object.fromEntries([
          ...(variant.colour ? [["Colour", variant.colour] as const] : []),
          ...(variant.size ? [["Size", variant.size] as const] : []),
        ]),
        source_updated_at: record.scrapedAt ?? null,
      }));

  return {
    sourceProductId: record.sourceProductId,
    product: {
      style_code: record.styleCode ?? null,
      canonical_url: record.canonicalUrl,
      title: record.title,
      subtitle: record.subtitle ?? null,
      description: record.description ?? null,
      product_type: record.category ?? null,
      department: null,
      gender: record.gender ?? null,
      currency: record.currency.toUpperCase(),
      price_minor: originalPriceMinor ?? currentPriceMinor,
      sale_price_minor: originalPriceMinor == null ? null : currentPriceMinor,
      availability_status: productAvailability,
      available: productAvailability === "in_stock" || productAvailability === "limited",
      source_updated_at: record.scrapedAt ?? null,
    },
    colourways,
    images,
    variants,
  };
}
