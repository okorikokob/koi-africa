import assert from "node:assert/strict";
import test from "node:test";
import { getLocalNikeProductById, getLocalNikeProducts } from "../lib/local-nike-catalog";

test("local Nike catalog is completely disabled by default", () => {
  delete process.env.USE_LOCAL_NIKE_CATALOG;
  assert.deepEqual(getLocalNikeProducts(), []);
});

test("demo catalog exposes grouped products and exact purchasable variants", () => {
  process.env.USE_LOCAL_NIKE_CATALOG = "true";
  const products = getLocalNikeProducts();
  assert.equal(products.length, 100);
  const product = products.find((candidate) => candidate.variants && candidate.variants.length > 1);
  assert.ok(product);
  assert.ok(product.allImages?.length);
  assert.ok(product.options?.some((option) => option.name === "Color"));
  assert.ok(product.options?.some((option) => option.name === "Size"));
  const variant = product.variants?.[0];
  assert.ok(variant?.id);
  assert.ok(variant?.sku);
  assert.ok(variant?.gtin);
  assert.equal(getLocalNikeProductById(product.id)?.id, product.id);
  const saleProduct = products.find((candidate) => candidate.compareAtPriceAmount != null);
  assert.ok(saleProduct);
  const compareAtPrice = saleProduct.compareAtPriceAmount;
  assert.ok(compareAtPrice != null);
  assert.ok(compareAtPrice > saleProduct.priceAmount);
  delete process.env.USE_LOCAL_NIKE_CATALOG;
});
