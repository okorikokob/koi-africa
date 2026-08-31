import assert from "node:assert/strict";
import test from "node:test";
import {
  isAuthorizedNikeRefreshSweep,
  nikeProactiveRefreshSettings,
  runNikeProactiveRefreshSweep,
  type NikeProactiveRefreshCandidate,
} from "@/lib/nike-proactive-refresh";

const now = new Date("2026-08-26T20:00:00.000Z");
const candidates: NikeProactiveRefreshCandidate[] = [
  { productId: "product-1", sourceProductId: "source-1", canonicalUrl: "https://www.nike.com/t/one" },
  { productId: "product-2", sourceProductId: "source-2", canonicalUrl: "https://www.nike.com/t/two" },
  { productId: "product-3", sourceProductId: "source-3", canonicalUrl: "https://www.nike.com/t/three" },
];

test("uses a 20-minute proactive threshold, ten-item batch, and stays ahead of checkout freshness", () => {
  assert.deepEqual(nikeProactiveRefreshSettings({}), { ageMinutes: 20, batchSize: 10 });
  assert.deepEqual(nikeProactiveRefreshSettings({
    KOI_NIKE_CHECKOUT_FRESHNESS_MINUTES: "15",
    KOI_NIKE_PROACTIVE_REFRESH_AGE_MINUTES: "20",
    KOI_NIKE_PROACTIVE_REFRESH_BATCH_SIZE: "100",
  }), { ageMinutes: 14, batchSize: 25 });
});

test("starts due products concurrently while reporting deduplication and isolated failures", async () => {
  let query: { staleBefore: Date; now: Date; limit: number } | undefined;
  const requested: string[] = [];
  const result = await runNikeProactiveRefreshSweep({
    now,
    ageMinutes: 20,
    batchSize: 10,
    repository: {
      async findDue(input) {
        query = input;
        return candidates;
      },
    },
    refreshRequester: {
      async request(candidate) {
        requested.push(candidate.productId);
        if (candidate.productId === "product-2") return { triggered: false };
        if (candidate.productId === "product-3") throw new Error("Apify unavailable");
        return { triggered: true };
      },
    },
  });
  assert.deepEqual(query, {
    staleBefore: new Date("2026-08-26T19:40:00.000Z"),
    now,
    limit: 10,
  });
  assert.deepEqual(requested.sort(), ["product-1", "product-2", "product-3"]);
  assert.deepEqual(result, {
    candidates: 3,
    triggered: 1,
    deduplicated: 1,
    failed: 1,
    failures: [{ productId: "product-3", error: "Apify unavailable" }],
  });
});

test("requires the configured cron bearer secret", () => {
  assert.equal(isAuthorizedNikeRefreshSweep("Bearer scheduler-secret", "scheduler-secret"), true);
  assert.equal(isAuthorizedNikeRefreshSweep("Bearer wrong", "scheduler-secret"), false);
  assert.equal(isAuthorizedNikeRefreshSweep(null, undefined), false);
});
