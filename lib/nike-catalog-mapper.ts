import type { ApifyNikeProductRecord } from "@/lib/catalog-ingestion-schema";

export type NormalizedNikeProduct = {
  sourceProductId: string;
  product: Record<string, string | number | boolean | null>;
  images: Array<Record<string, string | number | null>>;
  variants: Array<Record<string, string | number | boolean | null>>;
};

export function mapNikeProductRecord(record: ApifyNikeProductRecord): NormalizedNikeProduct {
  const currentPriceMinor = Math.round(record.currentPrice * 100);
  const originalPriceMinor = record.originalPrice == null ? null : Math.round(record.originalPrice * 100);

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
      available: record.availability !== "out_of_stock",
    },
    images: record.images.map((image, index) => ({
      official_cdn_url: image.url,
      alt_text: image.alt ?? null,
      position: index,
      color_name: null,
    })),
    variants: record.variants.map((variant) => ({
      source_variant_id: variant.id,
      sku: variant.sku ?? null,
      gtin: null,
      title: null,
      color_name: variant.colour ?? null,
      color_code: null,
      size_label: variant.size ?? null,
      size_system: null,
      currency: record.currency.toUpperCase(),
      price_minor: variant.currentPrice == null ? currentPriceMinor : Math.round(variant.currentPrice * 100),
      sale_price_minor: null,
      available: variant.availability !== "out_of_stock",
    })),
  };
}
