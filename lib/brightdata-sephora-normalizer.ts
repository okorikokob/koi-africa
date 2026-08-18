import type { BrightDataNormalizedProduct } from "@/lib/brightdata-nike-normalizer";
import { brightDataSephoraRecordSchema, type BrightDataSephoraRecord } from "@/lib/brightdata-sephora-schema";

export type BrightDataSephoraNormalizationResult = {
  products: BrightDataNormalizedProduct[];
  rejected: Array<{ index: number; reason: string }>;
  conflicts: string[];
  stats: { total: number; invalid: number; validVariantRows: number; products: number; variants: number; images: number };
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

function attributes(record: BrightDataSephoraRecord): Record<string, string> {
  return Object.fromEntries(record.variant_attributes.map(({ name, value }) => [name.toLowerCase(), value]));
}

function isOfficialProductImage(value: string): boolean {
  try {
    const url = new URL(value);
    return url.hostname === "www.sephora.com" && url.pathname.startsWith("/productimages/");
  } catch {
    return false;
  }
}

function isInvalidRecord(record: unknown): boolean {
  if (!record || typeof record !== "object") return true;
  const candidate = record as Record<string, unknown>;
  const url = typeof candidate.url === "string" ? candidate.url : "";
  return url.includes("productnotcarried") || !candidate.item_id || !candidate.variant_id || !candidate.group_id || !candidate.title || !candidate.image_url;
}

function uniqueImages(records: BrightDataSephoraRecord[]) {
  const seen = new Set<string>();
  const images: Array<{ official_cdn_url: string; alt_text: string; position: number; color_name: string | null }> = [];
  for (const record of records) {
    const color = attributes(record).color ?? null;
    for (const url of [record.image_url, ...record.additional_image_urls]) {
      if (!isOfficialProductImage(url)) continue;
      const key = new URL(url).pathname;
      if (seen.has(key)) continue;
      seen.add(key);
      images.push({ official_cdn_url: url, alt_text: record.title, position: images.length, color_name: color });
    }
  }
  return images;
}

export function normalizeBrightDataSephoraRecords(raw: unknown[]): BrightDataSephoraNormalizationResult {
  const rejected: BrightDataSephoraNormalizationResult["rejected"] = [];
  const conflicts: string[] = [];
  const valid: BrightDataSephoraRecord[] = [];
  let invalid = 0;

  raw.forEach((record, index) => {
    if (isInvalidRecord(record)) {
      invalid += 1;
      return;
    }
    const parsed = brightDataSephoraRecordSchema.safeParse(record);
    if (!parsed.success || !isOfficialProductImage(parsed.data.image_url)) {
      rejected.push({ index, reason: parsed.success ? "Primary image is not an official Sephora product image." : parsed.error.issues.map((issue) => issue.message).join("; ") });
      return;
    }
    valid.push(parsed.data);
  });

  const groups = new Map<string, BrightDataSephoraRecord[]>();
  for (const record of valid) groups.set(record.group_id, [...(groups.get(record.group_id) ?? []), record]);

  const products: BrightDataNormalizedProduct[] = [];
  for (const records of groups.values()) {
    const first = records[0];
    const variants = new Map<string, Record<string, unknown>>();
    const titles = new Set(records.map((record) => record.title));
    const brands = new Set(records.map((record) => record.brand));
    if (titles.size > 1) conflicts.push(`Product ${first.group_id} has conflicting titles: ${[...titles].join(" | ")}`);
    if (brands.size > 1) conflicts.push(`Product ${first.group_id} has conflicting brands: ${[...brands].join(" | ")}`);

    for (const record of records) {
      const attrs = attributes(record);
      const candidate: Record<string, unknown> = {
        source_variant_id: record.variant_id,
        source_item_id: record.item_id,
        sku: record.item_id,
        gtin: null,
        title: null,
        color_name: attrs.color ?? null,
        color_code: null,
        size_label: attrs.size ?? null,
        size_system: null,
        option_values: attrs,
        currency: "USD",
        price_minor: moneyToMinor(record.price),
        sale_price_minor: moneyToMinor(record.sale_price),
        availability_status: record.availability,
        available: record.availability !== "out_of_stock",
        product_url: record.url,
        image_url: record.image_url,
      };
      const existing = variants.get(record.variant_id);
      if (existing && JSON.stringify(existing) !== JSON.stringify(candidate)) {
        conflicts.push(`Variant ${record.variant_id} has conflicting rows in product ${record.group_id}.`);
        continue;
      }
      variants.set(record.variant_id, candidate);
    }

    const variantRows = [...variants.values()];
    const availablePrices = variantRows.filter((variant) => variant.available).map((variant) => Number(variant.sale_price_minor ?? variant.price_minor));
    const allPrices = variantRows.map((variant) => Number(variant.price_minor));
    const ratings = records.map((record) => record.star_rating).filter((rating): rating is number => rating != null);
    const images = uniqueImages(records);
    products.push({
      sourceProductId: first.group_id,
      product: {
        style_code: first.group_id,
        canonical_url: canonicalUrl(first.url),
        title: first.title,
        subtitle: first.brand,
        actual_brand_name: first.brand,
        description: records.reduce((best, record) => record.description.length > best.length ? record.description : best, ""),
        product_type: first.product_category || null,
        department: first.category_tree[0]?.name ?? null,
        gender: null,
        currency: "USD",
        price_minor: availablePrices.length ? Math.min(...availablePrices) : Math.min(...allPrices),
        sale_price_minor: variantRows.some((variant) => variant.sale_price_minor != null) ? Math.min(...variantRows.filter((variant) => variant.sale_price_minor != null).map((variant) => Number(variant.sale_price_minor))) : null,
        rating: ratings.length ? Math.max(...ratings) : null,
        review_count: Math.max(...records.map((record) => record.review_count)),
        availability_status: variantRows.some((variant) => variant.availability_status === "in_stock") ? "in_stock" : variantRows.some((variant) => variant.availability_status === "pre_order") ? "pre_order" : "out_of_stock",
        available: variantRows.some((variant) => variant.available),
      },
      images,
      variants: variantRows,
    });
  }

  return {
    products,
    rejected,
    conflicts,
    stats: {
      total: raw.length,
      invalid,
      validVariantRows: valid.length,
      products: products.length,
      variants: products.reduce((sum, product) => sum + product.variants.length, 0),
      images: products.reduce((sum, product) => sum + product.images.length, 0),
    },
  };
}
