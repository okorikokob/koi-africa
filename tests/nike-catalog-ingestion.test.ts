import assert from "node:assert/strict";
import test from "node:test";
import type { NikeIngestionRepository } from "@/lib/nike-catalog-ingestion";
import { ingestNikeSource } from "@/lib/nike-catalog-ingestion";
import type { NikeSyncCounts, NikeSyncRun } from "@/database/repositories/nikeCatalogIngestionRepository";

const validRecord = {
  storefront: "nike-us",
  brand: "Nike",
  sourceProductId: "nike-123",
  canonicalUrl: "https://www.nike.com/us/t/example/ABC-100",
  title: "Example",
  currentPrice: 100,
  originalPrice: null,
  currency: "USD",
  images: [{ url: "https://static.nike.com/a/images/example.jpg" }],
  variants: [{ id: "variant-1", currentPrice: 100, availability: "in_stock" }],
  availability: "in_stock",
};

class FakeRepository implements NikeIngestionRepository {
  existing: NikeSyncRun | undefined;
  upserts = 0;
  lastUpsertRunId: string | undefined;
  completed: NikeSyncCounts | undefined;
  errors: string[] = [];
  normalizedProducts: unknown[] = [];

  async ensureStorefront() { return { brandId: "brand", storefrontId: "storefront" }; }
  async startOrReuseRun(): Promise<NikeSyncRun> {
    return this.existing ?? {
      syncRunId: "run-row", reused: false, received: 0, productsUpserted: 0,
      imagesUpserted: 0, variantsUpserted: 0, productsCoalesced: 0, errors: 0,
      colourwaysUpserted: 0, authoritative: false,
    };
  }
  async upsertProduct(syncRunId: string, _storefrontId: string, _brandId: string, product: unknown) {
    this.upserts += 1;
    this.lastUpsertRunId = syncRunId;
    this.normalizedProducts.push(product);
    return { colourways: 0, images: 1, variants: 1 };
  }
  async recordError(input: { errorCode: string }) { this.errors.push(input.errorCode); }
  async completeRun(_id: string, counts: NikeSyncCounts) { this.completed = counts; }
  async failRun() {}
}

test("coalesces duplicate canonical products and records validation failures", async () => {
  const repository = new FakeRepository();
  const result = await ingestNikeSource(
    { actorId: "actor", runId: "run", datasetId: "dataset" },
    repository,
    async () => [validRecord, validRecord, { bad: true }],
  );
  assert.equal(repository.upserts, 1);
  assert.equal(repository.lastUpsertRunId, "run-row");
  assert.equal(result.received, 3);
  assert.equal(result.productsUpserted, 1);
  assert.equal(result.productsCoalesced, 1);
  assert.equal(result.errors, 1);
  assert.deepEqual(repository.errors, ["INVALID_PRODUCT_RECORD"]);
});

test("returns a stored provider run without loading or writing records", async () => {
  const repository = new FakeRepository();
  repository.existing = {
    syncRunId: "existing", reused: true, received: 12, productsUpserted: 11,
    imagesUpserted: 30, variantsUpserted: 40, productsCoalesced: 1, errors: 0,
    colourwaysUpserted: 8, authoritative: false,
  };
  let loaded = false;
  const result = await ingestNikeSource(
    { actorId: "actor", runId: "same-run", datasetId: "dataset" },
    repository,
    async () => { loaded = true; return [validRecord]; },
  );
  assert.equal(result.reused, true);
  assert.equal(loaded, false);
  assert.equal(repository.upserts, 0);
});

test("ingests a product-refresh record without losing colourway ownership or source freshness", async () => {
  const repository = new FakeRepository();
  const scrapedAt = "2026-08-26T12:00:00.000Z";
  const refreshedRecord = {
    ...validRecord,
    scrapedAt,
    colourways: [{
      styleColor: "STYLE-RED",
      colour: "Red",
      canonicalUrl: validRecord.canonicalUrl,
      currentPrice: 100,
      originalPrice: 120,
      currency: "USD",
      availability: "limited",
      primaryImage: "https://static.nike.com/a/images/red-front.jpg",
      images: [
        { url: "https://static.nike.com/a/images/red-front.jpg" },
        { url: "https://static.nike.com/a/images/red-back.jpg" },
      ],
      variants: [{ id: "variant-red-9", colour: "Red", size: "9", currentPrice: 100, availability: "limited" }],
    }],
  };
  const result = await ingestNikeSource(
    { actorId: "actor", runId: "product-refresh-run", datasetId: "product-refresh-dataset" },
    repository,
    async () => [refreshedRecord],
  );
  assert.equal(result.productsUpserted, 1);
  const normalized = repository.normalizedProducts[0] as {
    product: { source_updated_at: string };
    colourways: Array<{ style_color: string; primary_image_url: string }>;
    images: Array<{ style_color: string }>;
    variants: Array<{ source_variant_id: string; style_color: string; availability_status: string }>;
  };
  assert.equal(normalized.product.source_updated_at, scrapedAt);
  assert.equal(normalized.colourways[0].style_color, "STYLE-RED");
  assert.equal(normalized.colourways[0].primary_image_url, "https://static.nike.com/a/images/red-front.jpg");
  assert.deepEqual(normalized.images.map((image) => image.style_color), ["STYLE-RED", "STYLE-RED"]);
  assert.equal(normalized.variants[0].source_variant_id, "variant-red-9");
  assert.equal(normalized.variants[0].style_color, "STYLE-RED");
  assert.equal(normalized.variants[0].availability_status, "limited");
});
