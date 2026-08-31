import assert from "node:assert/strict";
import test from "node:test";
import type { NikeCheckoutRecord, NikeCheckoutRepository } from "@/lib/nike-checkout-validation";
import { NikeCheckoutValidationError, nikeCheckoutFreshnessMinutes, validateNikePostgresCheckout } from "@/lib/nike-checkout-validation";
import { NikePriorityRefreshCoordinator, type NikePriorityRefreshStore } from "@/lib/nike-priority-refresh";
import { preflightPaymentCatalogItem } from "@/lib/payment-catalog-preflight";
import { completeNikeProductRefresh } from "@/lib/nike-refresh-completion";
import type { Product } from "@/types";

const now = new Date("2026-08-26T12:00:00.000Z");

function record(overrides: {
  product?: Partial<NikeCheckoutRecord["product"]>;
  variant?: Partial<NonNullable<NikeCheckoutRecord["variant"]>> | null;
} = {}): NikeCheckoutRecord {
  const fresh = new Date(now.getTime() - 5 * 60_000);
  return {
    product: {
      id: "product-1", sourceProductId: "source-product-1", canonicalUrl: "https://www.nike.com/us/t/example/STYLE-1",
      isActive: true, available: true, availabilityStatus: "in_stock",
      lastSyncedAt: fresh, sourceUpdatedAt: fresh, ...overrides.product,
    },
    variant: overrides.variant === null ? null : {
      sourceVariantId: "variant-1", sku: "SKU-1", gtin: "GTIN-1",
      optionValues: { Colour: "Red", Size: "9" }, currency: "USD", priceMinor: 12500,
      isActive: true, available: true, availabilityStatus: "in_stock",
      lastSeenAt: fresh, sourceUpdatedAt: fresh, ...overrides.variant,
    },
  };
}

async function validate(
  value: NikeCheckoutRecord | null,
  refresh: { request(): Promise<{ triggered: boolean }> } = {
    async request() { return { triggered: true }; },
  },
) {
  const repository: NikeCheckoutRepository = { async findCheckoutRecord() { return value; } };
  return validateNikePostgresCheckout(
    { productId: "product-1", sourceVariantId: "variant-1" },
    { repository, refreshRequester: refresh, now, freshnessMinutes: 360 },
  );
}

async function rejectsCode(operation: () => Promise<unknown>, code: string) {
  await assert.rejects(operation, (error: unknown) =>
    error instanceof NikeCheckoutValidationError && error.code === code
  );
}

test("uses 360 minutes as the configurable Nike checkout freshness default", () => {
  assert.equal(nikeCheckoutFreshnessMinutes({}), 360);
  assert.equal(nikeCheckoutFreshnessMinutes({ KOI_NIKE_CHECKOUT_FRESHNESS_MINUTES: "15" }), 15);
  assert.equal(nikeCheckoutFreshnessMinutes({ KOI_NIKE_CHECKOUT_FRESHNESS_MINUTES: "invalid" }), 360);
});

test("accepts a fresh exact variant and preserves limited, identity, options, and price", async () => {
  const result = await validate(record({ product: { availabilityStatus: "limited" }, variant: { availabilityStatus: "limited" } }));
  assert.equal(result.variantId, "variant-1");
  assert.equal(result.price, 125);
  assert.equal(result.currency, "USD");
  assert.deepEqual(result.selectedOptions, [{ name: "Colour", value: "Red" }, { name: "Size", value: "9" }]);
});

test("accepts a normally refreshed exact variant up to the six-hour launch window", async () => {
  const withinWindow = new Date(now.getTime() - 359 * 60_000);
  const result = await validate(record({
    product: { sourceUpdatedAt: withinWindow },
    variant: { sourceUpdatedAt: withinWindow },
  }));
  assert.equal(result.variantId, "variant-1");
});

test("accepts stale product data and requests a priority refresh in the background", async () => {
  const refresh = { calls: 0, async request() { this.calls += 1; return { triggered: true }; } };
  const result = await validate(record({ product: { sourceUpdatedAt: new Date(now.getTime() - 361 * 60_000) } }), refresh);
  assert.equal(result.variantId, "variant-1");
  assert.equal(refresh.calls, 1);
});

test("accepts stale variant source freshness when authoritative checkout fields remain valid", async () => {
  const result = await validate(record({ variant: { sourceUpdatedAt: new Date(now.getTime() - 361 * 60_000) } }));
  assert.equal(result.variantId, "variant-1");
});

test("logs a background refresh-start failure without blocking valid stale checkout", async () => {
  let scheduled: (() => Promise<void>) | undefined;
  const errors: unknown[] = [];
  const repository: NikeCheckoutRepository = { async findCheckoutRecord() { return record({ product: { sourceUpdatedAt: new Date(now.getTime() - 361 * 60_000) } }); } };
  const result = await validateNikePostgresCheckout(
    { productId: "product-1", sourceVariantId: "variant-1" },
    {
      repository,
      refreshRequester: { async request() { throw new Error("Apify unavailable"); } },
      now,
      freshnessMinutes: 360,
      scheduleBackgroundRefresh: (task) => { scheduled = task; },
      onRefreshError: (error) => errors.push(error),
    },
  );
  assert.equal(result.variantId, "variant-1");
  assert.ok(scheduled);
  await scheduled();
  assert.equal(errors.length, 1);
});

test("fails missing or inactive products immediately without requesting refresh", async () => {
  const refresh = { calls: 0, async request() { this.calls += 1; return { triggered: true }; } };
  await rejectsCode(() => validate(null, refresh), "PRODUCT_UNAVAILABLE");
  await rejectsCode(() => validate(record({ product: { isActive: false } }), refresh), "PRODUCT_UNAVAILABLE");
  assert.equal(refresh.calls, 0);
});

test("fails missing, inactive, out-of-stock, and unknown variants closed", async () => {
  await rejectsCode(() => validate(record({ variant: null })), "VARIANT_UNAVAILABLE");
  await rejectsCode(() => validate(record({ variant: { isActive: false } })), "VARIANT_UNAVAILABLE");
  await rejectsCode(() => validate(record({ variant: { available: false, availabilityStatus: "out_of_stock" } })), "VARIANT_UNAVAILABLE");
  await rejectsCode(() => validate(record({ variant: { available: false, availabilityStatus: "unknown" } })), "VARIANT_UNAVAILABLE");
  await rejectsCode(() => validate(record({ product: { available: false, availabilityStatus: "unknown" } })), "PRODUCT_UNAVAILABLE");
});

class RefreshStore implements NikePriorityRefreshStore {
  claimed = false;
  running: string[] = [];
  failures: string[] = [];
  async claim() { if (this.claimed) return false; this.claimed = true; return true; }
  async markRunning(_productId: string, runId: string) { this.running.push(runId); }
  async markFailedByProduct(_productId: string, error: string) { this.failures.push(error); }
}

test("deduplicates repeated priority refresh requests within the refresh window", async () => {
  const store = new RefreshStore();
  let starts = 0;
  const coordinator = new NikePriorityRefreshCoordinator(store, {
    async start() { starts += 1; return { runId: "run-1" }; },
  }, 30, () => now);
  const input = { productId: "product-1", sourceProductId: "source-product-1", canonicalUrl: "https://www.nike.com/us/t/x" };
  assert.deepEqual(await coordinator.request(input), { triggered: true });
  assert.deepEqual(await coordinator.request(input), { triggered: false });
  assert.equal(starts, 1);
  assert.deepEqual(store.running, ["run-1"]);
});

test("records a failed refresh start while checkout remains fail-closed", async () => {
  const store = new RefreshStore();
  const coordinator = new NikePriorityRefreshCoordinator(store, {
    async start() { throw new Error("Apify unavailable"); },
  }, 30, () => now);
  await assert.rejects(() => coordinator.request({ productId: "product-1", sourceProductId: "source-product-1", canonicalUrl: "https://www.nike.com/us/t/x" }), /Apify unavailable/);
  assert.deepEqual(store.failures, ["Apify unavailable"]);
});

test("records failed Apify completion and ingests exactly one successful ProductRecord", async () => {
  const failures: string[] = [];
  const successes: string[] = [];
  const store = {
    async markFailedByRun(_runId: string, error: string) { failures.push(error); },
    async markSucceeded(runId: string) { successes.push(runId); },
  };
  const failed = await completeNikeProductRefresh({
    eventType: "ACTOR.RUN.FAILED",
    resource: { id: "failed-run", actId: "actor", defaultDatasetId: "dataset", status: "FAILED" },
  }, { store, ingest: async () => { throw new Error("must not ingest"); } });
  assert.deepEqual(failed, { ingested: false });
  assert.deepEqual(failures, ["Apify product refresh ended with FAILED."]);

  const succeeded = await completeNikeProductRefresh({
    eventType: "ACTOR.RUN.SUCCEEDED",
    resource: { id: "successful-run", actId: "actor", defaultDatasetId: "dataset", status: "SUCCEEDED" },
  }, {
    store,
    ingest: async (datasetId, source) => {
      assert.equal(datasetId, "dataset");
      assert.deepEqual(source, { actorId: "actor", runId: "successful-run" });
      return { productsUpserted: 1, errors: 0 };
    },
  });
  assert.equal(succeeded.ingested, true);
  assert.deepEqual(successes, ["successful-run"]);
});

const nikeProduct = {
  id: "product-1", title: "Nike Example", brandName: "Nike", category: "Shoes",
  imageUrl: "https://static.nike.com/example.jpg", priceAmount: 125, priceCurrency: "USD",
  vendorName: "Nike", vendorUrl: "https://www.nike.com/us/t/example/STYLE-1", isFeatured: false,
} satisfies Product;

test("PostgreSQL Nike preflight never calls the Bright Data legacy path", async () => {
  let postgresCalls = 0;
  let legacyCalls = 0;
  const result = await preflightPaymentCatalogItem(
    { product: nikeProduct, requestedVariantId: "variant-1", usePostgresNike: true },
    {
      postgresNike: async () => {
        postgresCalls += 1;
        return { variantId: "variant-1", sku: null, gtin: null, selectedOptions: [], price: 125, currency: "USD" };
      },
      legacy: async () => { legacyCalls += 1; throw new Error("Bright Data must not run"); },
      missingNikeVariant: () => new Error("missing variant"),
    },
  );
  assert.equal(result.variantId, "variant-1");
  assert.equal(postgresCalls, 1);
  assert.equal(legacyCalls, 0);
});

test("validation failure prevents Paystack and feature flag OFF preserves legacy preflight", async () => {
  let paystackCalls = 0;
  await assert.rejects(async () => {
    await preflightPaymentCatalogItem(
      { product: nikeProduct, requestedVariantId: "variant-1", usePostgresNike: true },
      {
        postgresNike: async () => { throw new NikeCheckoutValidationError("CATALOG_STALE", "stale"); },
        legacy: async () => { throw new Error("unused"); },
        missingNikeVariant: () => new Error("missing variant"),
      },
    );
    paystackCalls += 1;
  }, /stale/);
  assert.equal(paystackCalls, 0);

  let legacyCalls = 0;
  await preflightPaymentCatalogItem(
    { product: nikeProduct, requestedVariantId: "variant-1", usePostgresNike: false },
    {
      postgresNike: async () => { throw new Error("unused"); },
      legacy: async () => {
        legacyCalls += 1;
        return { price: 125, currency: "USD", variant: { id: "variant-1", options: [] } };
      },
      missingNikeVariant: () => new Error("missing variant"),
    },
  );
  assert.equal(legacyCalls, 1);
});
