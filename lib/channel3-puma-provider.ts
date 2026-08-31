import { Channel3, type Channel3Api } from "@channel3/sdk";
import { normalizeChannel3PumaProduct } from "@/lib/channel3-puma-normalizer";
import type {
  Channel3PumaFixture,
  Channel3PumaFixtureProduct,
  Channel3PumaImportStats,
  Channel3SkipReason,
} from "@/lib/channel3-puma-types";

const MAX_PRODUCTS = 100;
const PAGE_SIZE = 30;
const OFFICIAL_PUMA_DOMAIN = "us.puma.com";

function incrementReason(
  skipped: Partial<Record<Channel3SkipReason, number>>,
  reason: Channel3SkipReason,
): void {
  skipped[reason] = (skipped[reason] ?? 0) + 1;
}

export function createChannel3Client(): Channel3 {
  const apiKey = process.env.CHANNEL3_API_KEY;
  if (!apiKey) throw new Error("CHANNEL3_API_KEY is required to import Puma products.");
  return new Channel3({ apiKey, country: "US", currency: "USD", language: "en" });
}

export async function resolvePumaBrandId(client: Channel3): Promise<string> {
  const response = await client.brands.search({ query: "Puma", limit: 20 });
  const puma = response.brands.find((brand) => brand.name.trim().toLowerCase() === "puma");
  if (!puma) throw new Error("Channel3 brand search did not return an exact Puma match.");
  return puma.id;
}

export async function fetchPumaFixture(client = createChannel3Client()): Promise<Channel3PumaFixture> {
  const brandId = await resolvePumaBrandId(client);
  const products: Channel3PumaFixtureProduct[] = [];
  const seenProductIds = new Set<string>();
  const seenPageTokens = new Set<string>();
  const skipped: Partial<Record<Channel3SkipReason, number>> = {};
  let rawResults = 0;
  let pagesFetched = 0;
  let pageToken: string | undefined;
  let exhausted = false;

  while (products.length < MAX_PRODUCTS) {
    const page = await client.products.search({
      query: "Puma",
      filters: {
        brand_ids: [brandId],
        website_ids: [OFFICIAL_PUMA_DOMAIN],
        availability: ["InStock"],
      },
      config: { country: "US", currency: "USD", language: "en" },
      limit: PAGE_SIZE,
      page_token: pageToken,
    });
    pagesFetched += 1;
    const response = page.response as Channel3Api.SearchResponse;
    rawResults += response.products.length;

    for (const rawProduct of response.products) {
      if (seenProductIds.has(rawProduct.id)) {
        incrementReason(skipped, "duplicate_product_id");
        continue;
      }
      seenProductIds.add(rawProduct.id);
      const officialOffer = rawProduct.offers?.find((offer) =>
        offer.domain.trim().toLowerCase() === OFFICIAL_PUMA_DOMAIN,
      );
      if (!officialOffer) {
        incrementReason(skipped, "missing_offer");
        continue;
      }
      let detail: Channel3Api.Product;
      try {
        detail = await client.products.retrieve({
          product_id: rawProduct.id,
          country: "US",
          currency: "USD",
          language: "en",
        });
      } catch {
        incrementReason(skipped, "detail_request_failed");
        continue;
      }
      const normalized = normalizeChannel3PumaProduct({ ...detail, offers: [officialOffer] });
      if (normalized.reason) {
        incrementReason(skipped, normalized.reason);
        continue;
      }
      products.push(normalized.product);
      if (products.length === MAX_PRODUCTS) break;
    }

    const nextToken = response.next_page_token ?? undefined;
    if (!nextToken) {
      exhausted = true;
      break;
    }
    if (seenPageTokens.has(nextToken)) {
      throw new Error("Channel3 returned a repeated next_page_token; import stopped to avoid a pagination loop.");
    }
    seenPageTokens.add(nextToken);
    pageToken = nextToken;
  }

  const stats: Channel3PumaImportStats = {
    brandId,
    rawResults,
    validProducts: products.length,
    pagesFetched,
    exhaustedBeforeLimit: exhausted && products.length < MAX_PRODUCTS,
    skipped,
  };
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    provider: "channel3",
    brand: "Puma",
    stats,
    products,
  };
}
