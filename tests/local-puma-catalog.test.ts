import assert from "node:assert/strict";
import test from "node:test";
import checkoutFixture from "../data/puma-checkout-safe-catalog.json";
import sourceFixture from "../data/puma-demo-catalog.json";
import { getLocalPumaProductById, getLocalPumaProducts } from "../lib/local-puma-catalog";

test("local Puma catalogue is independently feature flagged", () => {
  delete process.env.USE_LOCAL_PUMA_CATALOG;
  assert.deepEqual(getLocalPumaProducts(), []);
});

test("local Puma catalogue exposes only classified checkout-safe products", () => {
  process.env.USE_LOCAL_PUMA_CATALOG = "true";
  const products = getLocalPumaProducts();
  assert.equal(sourceFixture.products.length, 100);
  assert.equal(products.length, 6);
  assert.equal(new Set(products.map((product) => product.id)).size, 6);
  assert.equal(checkoutFixture.products.length, 6);
  assert.ok(sourceFixture.products.every((product) => product.product.merchant_domain === "us.puma.com"));
  assert.ok(checkoutFixture.products.every((product) => product.product.merchant_domain === "us.puma.com"));
  assert.ok(products.every((product) =>
    product.brandName === "Puma"
      && product.id.startsWith("local-channel3-")
      && product.imageUrl
      && product.vendorUrl
      && product.priceAmount > 0
      && product.priceCurrency === "USD"
      && product.available,
  ));
  assert.equal(getLocalPumaProductById(products[0].id)?.id, products[0].id);
  delete process.env.USE_LOCAL_PUMA_CATALOG;
});
