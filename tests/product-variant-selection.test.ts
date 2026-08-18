import assert from "node:assert/strict";
import test from "node:test";
import { getLocalSephoraProducts } from "../lib/local-sephora-catalog";
import { resolveProductVariant } from "../lib/product-variant-selection";

test("a Sephora size selection resolves the exact authoritative variant", () => {
  process.env.USE_LOCAL_SEPHORA_CATALOG = "true";
  const product = getLocalSephoraProducts().find((candidate) => candidate.id === "local-sephora-P12569");
  assert.ok(product?.variants);
  const variant = resolveProductVariant(product.variants, { size: "16 oz/473 mL" });
  assert.equal(variant?.id, "1222371");
  assert.equal(variant?.sku, "1222371");
  assert.equal(variant?.price, 35);
  assert.equal(variant?.available, true);
  delete process.env.USE_LOCAL_SEPHORA_CATALOG;
});

test("multiple source variants without distinguishing options stay unresolved", () => {
  const variant = resolveProductVariant([
    { id: "one", checkoutUrl: "https://example.com", productUrl: "https://example.com", available: true, price: 10, currency: "USD", options: [], imageUrl: "" },
    { id: "two", checkoutUrl: "https://example.com", productUrl: "https://example.com", available: true, price: 12, currency: "USD", options: [], imageUrl: "" },
  ], {});
  assert.equal(variant, null);
});
