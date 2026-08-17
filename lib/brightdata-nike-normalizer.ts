import { brightDataNikeRecordSchema, type BrightDataNikeRecord } from "@/lib/brightdata-nike-schema";

export type BrightDataNormalizedProduct = {
  sourceProductId: string;
  product: Record<string, string | number | boolean | null>;
  images: Array<Record<string, string | number | null>>;
  variants: Array<Record<string, unknown>>;
};

export type BrightDataNormalizationResult = {
  products: BrightDataNormalizedProduct[];
  rejected: Array<{ index: number; reason: string }>;
  conflicts: string[];
  stats: { received: number; products: number; variants: number; images: number; preorders: number };
};

function moneyToMinor(value: string | null): number | null {
  if (value == null) return null;
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

function attributes(record: BrightDataNikeRecord): Record<string, string> {
  return Object.fromEntries(record.variant_attributes.map(({ name, value }) => [name.toLowerCase(), value]));
}

function uniqueBy<T>(values: T[], key: (value: T) => string): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const identity = key(value);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

export function normalizeBrightDataNikeRecords(raw: unknown[]): BrightDataNormalizationResult {
  const rejected: BrightDataNormalizationResult["rejected"] = [];
  const conflicts: string[] = [];
  const valid: BrightDataNikeRecord[] = [];
  raw.forEach((record, index) => {
    const parsed = brightDataNikeRecordSchema.safeParse(record);
    if (!parsed.success) {
      rejected.push({ index, reason: parsed.error.issues.map((issue) => issue.message).join("; ") });
    } else if (parsed.data.store_country !== "US") {
      rejected.push({ index, reason: `Unsupported storefront country ${parsed.data.store_country}` });
    } else {
      valid.push(parsed.data);
    }
  });

  const groups = new Map<string, BrightDataNikeRecord[]>();
  for (const record of valid) {
    const key = `${record.group_id}\u0000${canonicalUrl(record.url)}`;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }

  const products: BrightDataNormalizedProduct[] = [];
  let preorders = 0;
  for (const records of groups.values()) {
    const first = records[0];
    const variants = new Map<string, Record<string, unknown>>();
    for (const record of records) {
      const attrs = attributes(record);
      const original = moneyToMinor(record.price)!;
      const sale = moneyToMinor(record.sale_price);
      const candidate: Record<string, unknown> = {
        source_variant_id: record.variant_id,
        sku: record.mpn,
        gtin: record.gtin,
        title: null,
        color_name: attrs.color ?? null,
        color_code: attrs.style ?? record.mpn,
        size_label: attrs.size ?? null,
        size_system: "US",
        option_values: Object.fromEntries(Object.entries(attrs).filter(([name]) => name !== "style")),
        currency: "USD",
        price_minor: original,
        sale_price_minor: sale,
        availability_status: record.availability,
        available: record.availability !== "out_of_stock",
      };
      const existing = variants.get(record.variant_id);
      if (existing && JSON.stringify(existing) !== JSON.stringify(candidate)) {
        conflicts.push(`Variant ${record.variant_id} has conflicting records in product ${record.group_id}.`);
        continue;
      }
      variants.set(record.variant_id, candidate);
      if (record.availability === "pre_order") preorders += 1;
    }

    const variantRows = [...variants.values()];
    const effectivePrices = variantRows
      .filter((variant) => variant.available)
      .map((variant) => Number(variant.sale_price_minor ?? variant.price_minor));
    const originalPrices = variantRows.map((variant) => Number(variant.price_minor));
    const images = uniqueBy(records.flatMap((record) => {
      const color = attributes(record).color ?? null;
      return [record.image_url, ...record.additional_image_urls].map((url) => ({ url, color }));
    }), (image) => image.url).map((image, position) => ({
      official_cdn_url: image.url,
      alt_text: first.title,
      position,
      color_name: image.color,
    }));
    const ratings = records.map((record) => record.star_rating).filter((rating): rating is number => rating != null);
    const categoryRoot = first.category_tree[0]?.name ?? null;

    products.push({
      sourceProductId: first.group_id,
      product: {
        style_code: null,
        canonical_url: canonicalUrl(first.url),
        title: first.title,
        subtitle: [...new Set(records.map((record) => record.brand))].join(" / "),
        description: records.reduce((best, record) => record.description.length > best.length ? record.description : best, ""),
        product_type: first.product_category || null,
        department: categoryRoot,
        gender: categoryRoot && /^(men|women|kids)$/i.test(categoryRoot) ? categoryRoot : null,
        currency: "USD",
        price_minor: Math.max(...originalPrices),
        sale_price_minor: effectivePrices.length && Math.min(...effectivePrices) < Math.max(...originalPrices) ? Math.min(...effectivePrices) : null,
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
      received: raw.length,
      products: products.length,
      variants: products.reduce((sum, product) => sum + product.variants.length, 0),
      images: products.reduce((sum, product) => sum + product.images.length, 0),
      preorders,
    },
  };
}
