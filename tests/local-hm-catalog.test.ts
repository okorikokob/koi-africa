import assert from "node:assert/strict";
import test from "node:test";
import { getLocalHmProductById, getLocalHmProducts } from "../lib/local-hm-catalog";

test("local H&M catalogue is disabled independently by default", () => {
  delete process.env.USE_LOCAL_HM_CATALOG;
  assert.deepEqual(getLocalHmProducts(), []);
});

test("local H&M fixture exposes real products without fabricated variants", () => {
  process.env.USE_LOCAL_HM_CATALOG = "true";
  const products = getLocalHmProducts();
  assert.equal(products.length, 78);
  assert.ok(products.every((product) => product.brandName === "H&M"));
  assert.ok(products.every((product) => product.priceCurrency === "USD"));
  assert.ok(products.every((product) => product.variants?.length === 0));
  assert.ok(products.every((product) => product.options?.length === 0));
  assert.ok(products.every((product) => product.allImages?.every((url) => url.startsWith("https://image.hm.com/"))));
  const jacket = products.find((product) => product.title === "Tie-Belt Twill Jacket");
  assert.ok(jacket);
  assert.equal(jacket.colorName, "Black/floral");
  assert.equal(jacket.priceAmount, 59.99);
  assert.equal(getLocalHmProductById(jacket.id)?.id, jacket.id);
  delete process.env.USE_LOCAL_HM_CATALOG;
});
