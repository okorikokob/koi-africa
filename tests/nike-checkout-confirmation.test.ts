import assert from "node:assert/strict";
import test from "node:test";
import { confirmNikeCheckoutItems } from "@/lib/nike-checkout-confirmation";
import { NikeCheckoutValidationError } from "@/lib/nike-checkout-validation";

const item = { productId: "product-1", sourceVariantId: "variant-1" };

test("checkout confirmation returns authoritative exact-variant prices only after validation", async () => {
  const result = await confirmNikeCheckoutItems([item], {
    validate: async () => ({ variantId: "variant-1", price: 150, currency: "USD" }),
    findRefreshStates: async () => { throw new Error("unused"); },
  });
  assert.deepEqual(result, {
    status: "ready",
    prices: [{ productId: "product-1", sourceVariantId: "variant-1", price: 150, currency: "USD" }],
    message: null,
  });
});

test("stale checkout confirmation stays pending while one deduplicated refresh is active", async () => {
  const result = await confirmNikeCheckoutItems([item], {
    validate: async () => { throw new NikeCheckoutValidationError("CATALOG_STALE", "stale"); },
    findRefreshStates: async () => [{ productId: "product-1", status: "running", errorMessage: null }],
  });
  assert.deepEqual(result, { status: "pending", prices: [], message: null });
});

test("failed or ineffective refresh becomes a genuine fail-closed result", async () => {
  for (const status of ["failed", "succeeded"] as const) {
    const result = await confirmNikeCheckoutItems([item], {
      validate: async () => { throw new NikeCheckoutValidationError("CATALOG_STALE", "stale"); },
      findRefreshStates: async () => [{ productId: "product-1", status, errorMessage: "failed" }],
    });
    assert.equal(result.status, "failed");
    assert.match(result.message ?? "", /No payment has been taken/);
  }
});

test("missing, inactive, out-of-stock, and unknown variants remain unavailable", async () => {
  const result = await confirmNikeCheckoutItems([item], {
    validate: async () => { throw new NikeCheckoutValidationError("VARIANT_UNAVAILABLE", "The selected Nike variant is no longer available."); },
    findRefreshStates: async () => { throw new Error("unused"); },
  });
  assert.deepEqual(result, {
    status: "unavailable",
    prices: [],
    message: "The selected Nike variant is no longer available.",
  });
});
