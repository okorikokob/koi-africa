import { brightDataHmRecordSchema, type BrightDataHmRecord } from "@/lib/brightdata-hm-schema";
import type { BrightDataNormalizedProduct } from "@/lib/brightdata-nike-normalizer";

export type BrightDataHmNormalizationResult = {
  products: BrightDataNormalizedProduct[];
  rejected: Array<{ index: number; reason: string }>;
  stats: { total: number; successful: number; failed: number; products: number; images: number };
};

function moneyToMinor(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`Invalid price: ${value}`);
  return Math.round(parsed * 100);
}

function canonicalUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  url.search = "";
  return url.toString().replace(/\/$/, "");
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function isFailure(record: unknown): boolean {
  if (!record || typeof record !== "object") return false;
  const candidate = record as Record<string, unknown>;
  return Boolean(candidate.error || candidate.error_code);
}

export function normalizeBrightDataHmRecords(raw: unknown[]): BrightDataHmNormalizationResult {
  const rejected: BrightDataHmNormalizationResult["rejected"] = [];
  const successful: BrightDataHmRecord[] = [];
  let failed = 0;

  raw.forEach((record, index) => {
    if (isFailure(record)) {
      failed += 1;
      return;
    }
    const parsed = brightDataHmRecordSchema.safeParse(record);
    if (!parsed.success) {
      rejected.push({ index, reason: parsed.error.issues.map((issue) => issue.message).join("; ") });
      return;
    }
    successful.push(parsed.data);
  });

  const productsByIdentity = new Map<string, BrightDataNormalizedProduct>();
  for (const record of successful) {
    const productUrl = canonicalUrl(record.url);
    const identity = `${record.product_code}\u0000${productUrl}`;
    if (productsByIdentity.has(identity)) continue;

    const gallery = unique([record.main_image, ...record.image_urls]);
    const priceMinor = moneyToMinor(record.final_price)!;
    const originalPriceMinor = moneyToMinor(record.initial_price);
    productsByIdentity.set(identity, {
      sourceProductId: record.product_code,
      product: {
        style_code: record.product_code,
        canonical_url: productUrl,
        title: record.product_name,
        subtitle: record.color ?? null,
        description: record.description,
        product_type: record.category,
        department: record.category_tree[1]?.name ?? null,
        gender: record.category_tree[1]?.name ?? null,
        color_name: record.color ?? null,
        currency: "USD",
        price_minor: priceMinor,
        original_price_minor: originalPriceMinor,
        sale_price_minor: originalPriceMinor != null && originalPriceMinor > priceMinor ? priceMinor : null,
        rating: null,
        review_count: 0,
        availability_status: record.in_stock ? "in_stock" : "out_of_stock",
        available: record.in_stock,
      },
      images: gallery.map((url, position) => ({
        official_cdn_url: url,
        alt_text: record.product_name,
        position,
        color_name: record.color ?? null,
      })),
      variants: [],
    });
  }

  const products = [...productsByIdentity.values()];
  return {
    products,
    rejected,
    stats: {
      total: raw.length,
      successful: successful.length,
      failed,
      products: products.length,
      images: products.reduce((sum, product) => sum + product.images.length, 0),
    },
  };
}
