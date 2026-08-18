import assert from "node:assert/strict";
import test from "node:test";
import { getLocalSephoraProductById, getLocalSephoraProducts } from "../lib/local-sephora-catalog";

test("local Sephora catalogue is disabled independently by default", () => {
  delete process.env.USE_LOCAL_SEPHORA_CATALOG;
  assert.deepEqual(getLocalSephoraProducts(), []);
});

test("fixture exposes grouped products, actual brands, and exact variants", () => {
  process.env.USE_LOCAL_SEPHORA_CATALOG = "true";
  const products = getLocalSephoraProducts();
  assert.equal(products.length, 63);
  assert.ok(products.some((product) => product.brandName === "Jack Black"));
  assert.ok(products.some((product) => product.brandName === "CLINIQUE"));
  assert.ok(products.every((product) => product.vendorName === "Sephora"));
  assert.ok(products.every((product) => product.allImages?.every((url) => url.includes("sephora.com/productimages/"))));
  const grouped = products.find((product) => (product.variants?.length ?? 0) > 1 && product.options?.some((option) => option.name === "Size"));
  assert.ok(grouped);
  assert.equal(grouped.requiresVariantSelection, true);
  assert.ok(grouped.variants?.every((variant) => variant.id && variant.sku && variant.options.length > 0));
  assert.equal(getLocalSephoraProductById(grouped.id)?.id, grouped.id);
  delete process.env.USE_LOCAL_SEPHORA_CATALOG;
});
