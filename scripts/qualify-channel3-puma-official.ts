import { Channel3, type Channel3Api } from "@channel3/sdk";
import { loadEnvConfig } from "@next/env";
import { resolvePumaBrandId } from "../lib/channel3-puma-provider";

const OFFICIAL_HOST = "us.puma.com";
const LIMIT = Number(process.env.CHANNEL3_QUALIFICATION_LIMIT ?? 100);
const PAGE_SIZE = 30;
const MAX_PAGES = Number(process.env.CHANNEL3_QUALIFICATION_MAX_PAGES ?? Number.POSITIVE_INFINITY);

type RejectionReason =
  | "duplicate_product_id"
  | "detail_request_failed"
  | "search_missing_official_offer"
  | "detail_missing_official_offer"
  | "missing_price"
  | "missing_images";

function officialOffers(product: Channel3Api.Product): Channel3Api.ProductOffer[] {
  return (product.offers ?? []).filter((offer) => offer.domain.trim().toLowerCase() === OFFICIAL_HOST);
}

function increment(rejected: Partial<Record<RejectionReason, number>>, reason: RejectionReason): void {
  rejected[reason] = (rejected[reason] ?? 0) + 1;
}

function optionByName(product: Channel3Api.Product, pattern: RegExp): Channel3Api.VariantOption | undefined {
  return product.variants?.options.find((option) => pattern.test(option.name));
}

function selectionCandidate(product: Channel3Api.Product): Record<string, string> | null {
  for (const option of product.variants?.options ?? []) {
    const value = option.values.find((candidate) => candidate.exists && candidate.available !== "OutOfStock");
    if (value) return { [option.name]: value.label };
  }
  return null;
}

function selectionHonored(requested: Record<string, string>, product: Channel3Api.Product): boolean {
  const selected = new Map((product.variants?.selected ?? []).map((option) => [option.name.toLowerCase(), option.label]));
  return Object.entries(requested).every(([name, label]) => selected.get(name.toLowerCase()) === label);
}

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const apiKey = process.env.CHANNEL3_API_KEY;
  if (!apiKey) throw new Error("CHANNEL3_API_KEY is required for official Puma qualification.");

  const client = new Channel3({ apiKey, country: "US", currency: "USD", language: "en" });
  const brandId = await resolvePumaBrandId(client);
  const searchProducts: Channel3Api.Product[] = [];
  const seenIds = new Set<string>();
  const seenTokens = new Set<string>();
  const rejected: Partial<Record<RejectionReason, number>> = {};
  const detailErrorSamples: Array<{ productId: string; error: string }> = [];
  const searchOfferSamples: Array<{ productId: string; offerDomain: string; urlHost: string; url: string }> = [];
  let rawResults = 0;
  let pagesFetched = 0;
  let pageToken: string | undefined;
  let exhausted = false;

  while (searchProducts.length < LIMIT) {
    const page = await client.products.search({
      query: "Puma",
      filters: {
        brand_ids: [brandId],
        website_ids: [OFFICIAL_HOST],
        availability: ["InStock"],
      },
      config: { country: "US", currency: "USD", language: "en" },
      limit: PAGE_SIZE,
      page_token: pageToken,
    });
    const response = page.response as Channel3Api.SearchResponse;
    pagesFetched += 1;
    rawResults += response.products.length;
    for (const product of response.products) {
      if (searchOfferSamples.length < 10) {
        for (const offer of product.offers ?? []) {
          if (searchOfferSamples.length === 10) break;
          let urlHost = "invalid-url";
          try { urlHost = new URL(offer.url).hostname.toLowerCase(); } catch { /* reported as invalid-url */ }
          searchOfferSamples.push({ productId: product.id, offerDomain: offer.domain, urlHost, url: offer.url });
        }
      }
      if (seenIds.has(product.id)) {
        increment(rejected, "duplicate_product_id");
        continue;
      }
      seenIds.add(product.id);
      const offers = officialOffers(product);
      if (offers.length === 0) {
        increment(rejected, "search_missing_official_offer");
        continue;
      }
      if (!offers.some((offer) => Number.isFinite(offer.price.price) && offer.price.price > 0)) {
        increment(rejected, "missing_price");
        continue;
      }
      if (!(product.images ?? []).some((image) => image.url || image.cleaned_url)) {
        increment(rejected, "missing_images");
        continue;
      }
      searchProducts.push(product);
      if (searchProducts.length === LIMIT) break;
    }
    const nextToken = response.next_page_token ?? undefined;
    if (pagesFetched >= MAX_PAGES) break;
    if (!nextToken) {
      exhausted = true;
      break;
    }
    if (seenTokens.has(nextToken)) throw new Error("Channel3 returned a repeated official-Puma page token.");
    seenTokens.add(nextToken);
    pageToken = nextToken;
  }

  const qualified: Channel3Api.Product[] = [];
  let detailProductsRetrieved = 0;
  let detailProductsRetainingOfficialOffer = 0;
  let withPrice = 0;
  let withSalePrice = 0;
  let withImages = 0;
  let withVariants = 0;
  let withSizeOptions = 0;
  let withColourOptions = 0;
  let withSelectableState = 0;
  const variantProducts: Array<Record<string, unknown>> = [];

  for (const searchProduct of searchProducts) {
    let detail: Channel3Api.Product;
    try {
      detail = await client.products.retrieve({
        product_id: searchProduct.id,
        country: "US",
        currency: "USD",
        language: "en",
      });
    } catch (error) {
      increment(rejected, "detail_request_failed");
      if (detailErrorSamples.length < 5) {
        detailErrorSamples.push({
          productId: searchProduct.id,
          error: error instanceof Error ? `${error.name}: ${error.message}` : "Unknown detail request error",
        });
      }
      continue;
    }
    detailProductsRetrieved += 1;
    if (officialOffers(detail).length > 0) detailProductsRetainingOfficialOffer += 1;
    else increment(rejected, "detail_missing_official_offer");
    qualified.push(detail);
    const pricedOffer = officialOffers(searchProduct).find((offer) => Number.isFinite(offer.price.price) && offer.price.price > 0)!;
    withPrice += 1;
    withImages += 1;
    if (pricedOffer.price.compare_at_price != null && pricedOffer.price.compare_at_price > pricedOffer.price.price) {
      withSalePrice += 1;
    }
    if (detail.variants) withVariants += 1;
    const sizeOption = optionByName(detail, /size/i);
    const colourOption = optionByName(detail, /colou?r/i);
    if (sizeOption?.values.length) withSizeOptions += 1;
    if (colourOption?.values.length) withColourOptions += 1;

    const requested = selectionCandidate(detail);
    let selectedProbe: Channel3Api.Product | null = null;
    if (requested) {
      selectedProbe = await client.products.retrieve({
        product_id: detail.id,
        country: "US",
        currency: "USD",
        language: "en",
        selected_options: requested,
      });
      if (selectionHonored(requested, selectedProbe)) {
        withSelectableState += 1;
      }
    }
    if (detail.variants) {
      variantProducts.push({
        id: detail.id,
        title: detail.title,
        category: detail.category?.title ?? null,
        options: detail.variants.options,
        selected: detail.variants.selected,
        requested,
        effectiveProductId: selectedProbe?.id ?? null,
        effectiveSelected: selectedProbe?.variants?.selected ?? [],
      });
    }
  }

  console.log(JSON.stringify({
    officialHost: OFFICIAL_HOST,
    brandId,
    rawResults,
    uniqueSearchProducts: searchProducts.length,
    validOfficialProducts: qualified.length,
    detailProductsRetrieved,
    detailProductsRetainingOfficialOffer,
    pagesFetched,
    exhaustedBeforeLimit: exhausted && searchProducts.length < LIMIT,
    withPrice,
    withSalePrice,
    withImages,
    withVariants,
    withSizeOptions,
    withColourOptions,
    withSelectableState,
    rejected,
    detailErrorSamples,
    searchOfferSamples,
    variantProducts,
  }, null, 2));
}

void main().catch((error: unknown) => {
  console.error("[scripts/qualify-channel3-puma-official]", error);
  process.exitCode = 1;
});
