import { loadEnvConfig } from "@next/env";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const API_URL = "https://api.zyte.com/v1/extract";
const LIMIT = Math.min(Number(process.env.ZYTE_ZARA_LIMIT ?? 100), 100);
const CONCURRENCY = Math.max(1, Math.min(Number(process.env.ZYTE_ZARA_CONCURRENCY ?? 4), 8));
const REQUEST_TIMEOUT_MS = Math.max(30_000, Number(process.env.ZYTE_ZARA_TIMEOUT_MS ?? 120_000));
const OUTPUT = resolve(process.env.ZYTE_ZARA_OUTPUT ?? "data/zyte-zara-qualification.json");
const OFFICIAL_HOST = /(^|\.)zara\.com$/i;

const LISTINGS = [
  ["dresses", "https://www.zara.com/us/en/woman-dresses-l1066.html"],
  ["tops", "https://www.zara.com/us/en/woman-tops-l1322.html"],
  ["shirts", "https://www.zara.com/us/en/man-shirts-l737.html"],
  ["trousers", "https://www.zara.com/us/en/woman-trousers-l1335.html"],
  ["jeans", "https://www.zara.com/us/en/woman-jeans-l1119.html"],
  ["skirts", "https://www.zara.com/us/en/woman-skirts-l1299.html"],
  ["jackets-coats", "https://www.zara.com/us/en/woman-outerwear-l1184.html"],
  ["shoes", "https://www.zara.com/us/en/woman-shoes-l1251.html"],
] as const;

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Obj = Record<string, Json>;
type Status = "checkout_safe" | "missing_required_variants" | "unavailable" | "ambiguous" | "extraction_failed";
type Source = "zyte_product" | "browser_structured_state" | "page_backed_network";

type Variant = {
  id: string | null;
  sku: string | null;
  size: string | null;
  color: string | null;
  availability: "InStock" | "OutOfStock" | null;
  source: Source;
};

function object(value: Json | undefined): Obj | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Obj : null;
}

function text(value: Json | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : typeof value === "number" ? String(value) : null;
}

function officialUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value, "https://www.zara.com");
    if (!OFFICIAL_HOST.test(url.hostname) || !/-p\d+\.html(?:$|[?#])/i.test(url.href)) return null;
    url.hash = "";
    return url.href;
  } catch { return null; }
}

function productKey(url: string): string {
  return url.match(/-p(\d+)\.html/i)?.[1] ?? url;
}

function availability(value: Json | undefined): "InStock" | "OutOfStock" | null {
  if (typeof value === "boolean") return value ? "InStock" : "OutOfStock";
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase();
  if (/in.?stock|available|availability|low.?stock/.test(normalized) && !/unavailable|not.?available|out.?of.?stock/.test(normalized)) return "InStock";
  if (/out.?of.?stock|unavailable|not.?available|sold.?out/.test(normalized)) return "OutOfStock";
  return null;
}

function idFrom(record: Obj): string | null {
  return text(record.id) ?? text(record.sku) ?? text(record.reference) ?? text(record.productId) ?? text(record.product_id);
}

function normalizeAutoVariants(product: Obj): Variant[] {
  const topColor = text(product.color);
  const variants = Array.isArray(product.variants) ? product.variants : [];
  return variants.flatMap((entry): Variant[] => {
    const variant = object(entry);
    if (!variant) return [];
    return [{
      id: text(variant.mpn) ?? text(variant.gtin) ?? text(variant.sku),
      sku: text(variant.sku),
      size: text(variant.size),
      color: text(variant.color) ?? topColor,
      availability: availability(variant.availability),
      source: "zyte_product",
    }];
  });
}

function identityDigits(value: string | null): string | null {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length >= 7 ? digits.replace(/^0+/, "") : null;
}

function identityMatches(record: Obj, pageIdentities: string[]): boolean {
  const values = [record.productId, record.product_id, record.reference, record.displayReference, record.sku]
    .map((value) => identityDigits(text(value)))
    .filter((value): value is string => value != null);
  return values.some((value) => pageIdentities.some((page) => value.includes(page) || page.includes(value)));
}

function walkForVariants(root: Json, source: Exclude<Source, "zyte_product">, pageIdentities: string[]): Variant[] {
  const found: Variant[] = [];
  const seen = new Set<Json>();
  function walk(value: Json, inheritedColor: string | null, identityMatched: boolean): void {
    if (!value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) { for (const item of value) walk(item, inheritedColor, identityMatched); return; }
    const record = value as Obj;
    const matched = identityMatched || identityMatches(record, pageIdentities);
    const namedColor = Array.isArray(record.sizes) ? text(record.name) : null;
    const color = text(record.color) ?? text(record.colour) ?? text(record.colorName) ?? namedColor ?? inheritedColor;
    const sizes = Array.isArray(record.sizes) ? record.sizes : Array.isArray(record.sizeList) ? record.sizeList : null;
    if (matched && sizes) {
      for (const item of sizes) {
        const size = object(item);
        if (!size) continue;
        found.push({
          id: idFrom(size),
          sku: text(size.sku) ?? text(size.reference),
          size: text(size.size) ?? text(size.name) ?? text(size.description),
          color,
          availability: availability(size.availability) ?? availability(size.status) ?? availability(size.isAvailable),
          source,
        });
      }
    }
    for (const child of Object.values(record)) walk(child, color, matched);
  }
  walk(root, null, false);
  return found;
}

function parseEmbeddedState(html: string, pageIdentities: string[]): Variant[] {
  const results: Variant[] = [];
  const scripts = html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) ?? [];
  for (const script of scripts) {
    const body = script.replace(/^<script\b[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
    if (!body || body.length > 8_000_000 || !/(sizes|availability|sku|productId)/i.test(body)) continue;
    const candidates = [body, body.match(/(?:window\.[\w.]+\s*=|__NEXT_DATA__\s*=)\s*([\s\S]+?);?$/)?.[1]].filter(Boolean) as string[];
    for (const candidate of candidates) {
      try { results.push(...walkForVariants(JSON.parse(candidate) as Json, "browser_structured_state", pageIdentities)); break; } catch { /* non-JSON script */ }
    }
  }
  return results;
}

function parseNetwork(captures: Json | undefined, pageIdentities: string[]): Variant[] {
  if (!Array.isArray(captures)) return [];
  const variants: Variant[] = [];
  for (const entry of captures) {
    const capture = object(entry);
    const body = text(capture?.httpResponseBody);
    if (!body) continue;
    try { variants.push(...walkForVariants(JSON.parse(Buffer.from(body, "base64").toString("utf8")) as Json, "page_backed_network", pageIdentities)); } catch { /* not JSON */ }
  }
  return variants;
}

function dedupeVariants(variants: Variant[]): Variant[] {
  const map = new Map<string, Variant>();
  for (const variant of variants) {
    const key = [variant.id, variant.sku, variant.size, variant.color, variant.availability].join("|");
    if (variant.size && !map.has(key)) map.set(key, variant);
  }
  return [...map.values()];
}

async function zyte(apiKey: string, payload: Obj, attempts = 3): Promise<Obj> {
  let last: Error | null = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
      return await response.json() as Obj;
    } catch (error) {
      last = error instanceof Error ? error : new Error("Unknown Zyte error");
      if (attempt < attempts) await new Promise((done) => setTimeout(done, attempt * 1000));
    }
  }
  throw last;
}

async function mapLimit<T, R>(items: T[], worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function run(): Promise<void> {
    while (cursor < items.length) { const index = cursor++; results[index] = await worker(items[index], index); }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, run));
  return results;
}

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const apiKey = process.env.ZYTE_API_KEY;
  if (!apiKey) throw new Error("ZYTE_API_KEY is required.");
  const listingEvidence: Obj[] = [];
  const discovered = new Map<string, { url: string; category: string; listEntry: Json }>();

  if (process.env.ZYTE_ZARA_REUSE_DISCOVERY === "1") {
    const previous = JSON.parse(await readFile(OUTPUT, "utf8")) as Obj;
    const previousProducts = Array.isArray(previous.products) ? previous.products : [];
    for (const entry of previousProducts) {
      const record = object(entry);
      const url = officialUrl(text(record?.requestedUrl));
      const category = text(record?.category);
      if (url && category) discovered.set(productKey(url), { url, category, listEntry: null });
    }
    const previousListings = object(previous.catalogueDiscovery)?.listings;
    if (Array.isArray(previousListings)) listingEvidence.push(...previousListings.map(object).filter((item): item is Obj => item != null));
    process.stderr.write(`[listing] reused ${discovered.size} previously discovered official URLs\n`);
  }

  for (const [category, url] of process.env.ZYTE_ZARA_REUSE_DISCOVERY === "1" ? [] : LISTINGS) {
    process.stderr.write(`[listing] ${category} ${url}\n`);
    try {
      const response = await zyte(apiKey, { url, productList: true, browserHtml: true, productListOptions: { extractFrom: "browserHtml" } });
      const list = object(response.productList);
      const products = Array.isArray(list?.products) ? list.products : [];
      let accepted = 0;
      for (const entry of products) {
        const item = object(entry);
        const productUrl = officialUrl(item?.url);
        if (!productUrl || discovered.has(productKey(productUrl)) || discovered.size >= LIMIT) continue;
        discovered.set(productKey(productUrl), { url: productUrl, category, listEntry: entry });
        accepted += 1;
      }
      listingEvidence.push({ category, url, rawProductListEntries: products.length, uniqueAccepted: accepted, browserRendering: true });
      process.stderr.write(`[listing] ${category}: ${products.length} raw, ${accepted} accepted, ${discovered.size} total\n`);
    } catch (error) {
      listingEvidence.push({ category, url, rawProductListEntries: 0, uniqueAccepted: 0, browserRendering: true, error: error instanceof Error ? error.message : "Unknown error" });
      process.stderr.write(`[listing] ${category}: failed (${error instanceof Error ? error.message : "Unknown error"})\n`);
    }
    if (discovered.size >= LIMIT) break;
  }

  const products = await mapLimit([...discovered.values()], async (candidate, index) => {
    try {
      const response = await zyte(apiKey, {
        url: candidate.url,
        product: true,
        browserHtml: true,
        productOptions: { extractFrom: "browserHtml", model: "2024-09-16" },
        networkCapture: [{ filterType: "url", matchType: "contains", value: "/itxrest/", httpResponseBody: true }],
      });
      const product = object(response.product);
      if (!product || Number(object(product.metadata)?.probability ?? 0) < 0.5) throw new Error("Zyte did not return a trustworthy product extraction");
      const canonical = officialUrl(text(product.canonicalUrl)) ?? officialUrl(text(product.url)) ?? candidate.url;
      const pageIdentities = [text(product.sku), text(product.mpn), productKey(canonical)]
        .map(identityDigits).filter((value): value is string => value != null);
      const automatic = normalizeAutoVariants(product);
      const browser = parseEmbeddedState(text(response.browserHtml) ?? "", pageIdentities);
      const network = parseNetwork(response.networkCapture, pageIdentities);
      const variants = dedupeVariants([...automatic, ...browser, ...network]);
      const sizeDependent = /dress|top|shirt|trouser|pant|jean|skirt|jacket|coat|shoe|sandal|boot|sneaker|flat|heel/i.test(`${candidate.category} ${text(product.name) ?? ""}`);
      const exact = variants.filter((variant) => variant.size && variant.color && (variant.id || variant.sku) && variant.availability);
      let status: Status = "missing_required_variants";
      if (!sizeDependent) status = exact.some((variant) => variant.availability === "InStock") ? "checkout_safe" : "ambiguous";
      else if (exact.some((variant) => variant.availability === "InStock")) status = "checkout_safe";
      else if (exact.length && exact.every((variant) => variant.availability === "OutOfStock")) status = "unavailable";
      else if (variants.some((variant) => variant.size && variant.availability === "InStock") && !variants.some((variant) => variant.color)) status = "missing_required_variants";
      else if (variants.length) status = "ambiguous";
      process.stderr.write(`[${index + 1}/${discovered.size}] ${status} ${candidate.url}\n`);
      return {
        category: candidate.category, requestedUrl: candidate.url, canonicalUrl: canonical,
        name: text(product.name), productId: text(product.mpn), sku: text(product.sku), brand: text(object(product.brand)?.name),
        price: text(product.price), regularPrice: text(product.regularPrice), currency: text(product.currency),
        imageCount: (Array.isArray(product.images) ? product.images.length : 0) + (object(product.mainImage) ? 1 : 0),
        availability: text(product.availability), sizeDependent, status, variants,
        sourceCounts: {
          zyteAutomaticProduct: variants.filter((v) => v.source === "zyte_product").length,
          browserStructuredState: variants.filter((v) => v.source === "browser_structured_state").length,
          pageBackedNetwork: variants.filter((v) => v.source === "page_backed_network").length,
        },
      } as unknown as Json;
    } catch (error) {
      return { category: candidate.category, requestedUrl: candidate.url, sizeDependent: true, status: "extraction_failed", error: error instanceof Error ? error.message : "Unknown error", variants: [] } as unknown as Json;
    }
  });

  const records = products.map(object).filter((value): value is Obj => value != null);
  const count = (predicate: (record: Obj) => boolean) => records.filter(predicate).length;
  const variantList = (record: Obj) => Array.isArray(record.variants) ? record.variants.map(object).filter((v): v is Obj => v != null) : [];
  const sizeDependent = records.filter((record) => record.sizeDependent === true);
  const statusCounts = Object.fromEntries((["checkout_safe", "missing_required_variants", "unavailable", "ambiguous", "extraction_failed"] as Status[]).map((status) => [status, sizeDependent.filter((p) => p.status === status).length]));
  const report = {
    generatedAt: new Date().toISOString(), scope: { source: "zara.com only", limit: LIMIT, concurrency: CONCURRENCY },
    catalogueDiscovery: {
      uniqueOfficialProductsDiscovered: discovered.size,
      categoryBreakdown: Object.fromEntries(LISTINGS.map(([category]) => [category, [...discovered.values()].filter((p) => p.category === category).length])),
      listingPagesProcessed: listingEvidence.length,
      browserRenderingUsed: true,
      extractionFailures: listingEvidence.filter((e) => e.error).length,
      listings: listingEvidence,
    },
    commercialData: {
      productsWithPrice: count((p) => text(p.price) != null), productsWithSalePrice: count((p) => Number(text(p.regularPrice)) > Number(text(p.price))),
      productsWithImages: count((p) => Number(p.imageCount) > 0), productsWithCanonicalZaraUrl: count((p) => officialUrl(text(p.canonicalUrl)) != null),
      productsWithStableProductIdOrSku: count((p) => text(p.productId) != null || text(p.sku) != null),
    },
    variantData: {
      productsWithVariants: count((p) => variantList(p).length > 0), productsWithSize: count((p) => variantList(p).some((v) => text(v.size))),
      productsWithColor: count((p) => variantList(p).some((v) => text(v.color))), productsWithBothSizeAndColor: count((p) => variantList(p).some((v) => text(v.size) && text(v.color))),
      productsWithStableVariantIdOrSku: count((p) => variantList(p).some((v) => text(v.id) || text(v.sku))),
      productsWithExplicitPerVariantAvailability: count((p) => variantList(p).some((v) => text(v.availability))),
      productsWithAtLeastOneAvailableSize: count((p) => variantList(p).some((v) => text(v.size) && v.availability === "InStock")),
      productsWithExactSelectableAvailableCombination: count((p) => p.status === "checkout_safe"),
    },
    checkoutAssessment: { totalEvaluated: sizeDependent.length, ...statusCounts, checkoutSafePercentage: sizeDependent.length ? Number((statusCounts.checkout_safe / sizeDependent.length * 100).toFixed(1)) : 0 },
    extractionSource: {
      zyteAutomaticProduct: count((p) => variantList(p).some((v) => v.source === "zyte_product")),
      browserRenderedStructuredState: count((p) => variantList(p).some((v) => v.source === "browser_structured_state")),
      pageBackedNetworkData: count((p) => variantList(p).some((v) => v.source === "page_backed_network")),
    },
    products,
  };
  await mkdir(resolve(OUTPUT, ".."), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ output: OUTPUT, ...report.catalogueDiscovery, commercialData: report.commercialData, variantData: report.variantData, checkoutAssessment: report.checkoutAssessment, extractionSource: report.extractionSource }, null, 2));
}

void main().catch((error: unknown) => { console.error("[qualify-zyte-zara-official]", error instanceof Error ? error.message : error); process.exitCode = 1; });
