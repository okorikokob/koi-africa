import assert from "node:assert/strict";
import test from "node:test";
import { prewarmNikeProduct } from "@/lib/nike-demand-refresh";
import { isNikePrewarmProduct, requestNikeProductPrewarm } from "@/lib/nike-prewarm-client";

const now = new Date("2026-08-27T10:00:00.000Z");
const candidate = {
  productId: "9810eb6a-e084-4cf1-a6c5-aeb0274890c8",
  sourceProductId: "nike-source-1",
  canonicalUrl: "https://www.nike.com/t/example/STYLE-1",
};

test("demand refresh uses the proactive age and forwards the stored Nike identity", async () => {
  let query: { productId: string; staleBefore: Date; now: Date } | undefined;
  let requested: typeof candidate | undefined;
  const result = await prewarmNikeProduct(candidate.productId, {
    now,
    ageMinutes: 20,
    repository: {
      async findDueProduct(input) {
        query = input;
        return candidate;
      },
    },
    refreshRequester: {
      async request(input) {
        requested = input;
        return { triggered: true };
      },
    },
  });

  assert.deepEqual(query, {
    productId: candidate.productId,
    staleBefore: new Date("2026-08-27T09:40:00.000Z"),
    now,
  });
  assert.deepEqual(requested, candidate);
  assert.deepEqual(result, { eligible: true, triggered: true });
});

test("fresh, missing, inactive, and non-Nike products do not request an Actor run", async () => {
  let requests = 0;
  const result = await prewarmNikeProduct(candidate.productId, {
    now,
    ageMinutes: 20,
    repository: { async findDueProduct() { return null; } },
    refreshRequester: { async request() { requests += 1; return { triggered: true }; } },
  });

  assert.deepEqual(result, { eligible: false, triggered: false });
  assert.equal(requests, 0);
});

test("demand refresh preserves server-side deduplication results", async () => {
  const result = await prewarmNikeProduct(candidate.productId, {
    repository: { async findDueProduct() { return candidate; } },
    refreshRequester: { async request() { return { triggered: false }; } },
  });
  assert.deepEqual(result, { eligible: true, triggered: false });
});

test("browser prewarming is Nike-only and sends a non-blocking same-origin request", async () => {
  assert.equal(isNikePrewarmProduct({ id: candidate.productId, brandName: " NIKE " }), true);
  assert.equal(isNikePrewarmProduct({ id: candidate.productId, brandName: "Puma" }), false);

  let requestedUrl: string | URL | Request | undefined;
  let requestedInit: RequestInit | undefined;
  const accepted = await requestNikeProductPrewarm(
    { id: candidate.productId, brandName: "Nike" },
    async (input, init) => {
      requestedUrl = input;
      requestedInit = init;
      return new Response(null, { status: 202 });
    },
  );
  assert.equal(accepted, true);
  assert.equal(requestedUrl, "/api/catalog/refresh/nike/prewarm");
  assert.equal(requestedInit?.method, "POST");
  assert.equal(requestedInit?.keepalive, true);
  assert.equal(requestedInit?.body, JSON.stringify({ productId: candidate.productId }));
});

test("browser prewarming does not contact the endpoint for other brands", async () => {
  let calls = 0;
  const accepted = await requestNikeProductPrewarm(
    { id: candidate.productId, brandName: "Zara" },
    async () => {
      calls += 1;
      return new Response(null, { status: 202 });
    },
  );
  assert.equal(accepted, false);
  assert.equal(calls, 0);
});
