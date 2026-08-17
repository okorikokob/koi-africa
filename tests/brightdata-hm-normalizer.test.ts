import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBrightDataHmRecords } from "../lib/brightdata-hm-normalizer";

function record(overrides: Record<string, unknown> = {}) {
  return {
    category_tree: [
      { name: "HM.com", url: "https://www2.hm.com/en_us/index.html" },
      { name: "Women", url: "https://www2.hm.com/en_us/women.html" },
    ],
    color: "Black",
    country_code: "US",
    currency: "USD",
    description: "A real H&M product.",
    domain: "www2.hm.com",
    final_price: "$59.99",
    image_urls: [
      "https://image.hm.com/a.jpg?imwidth=2160",
      "https://image.hm.com/b.jpg?imwidth=2160",
      "https://image.hm.com/b.jpg?imwidth=2160",
    ],
    in_stock: true,
    initial_price: "$79.99",
    main_image: "https://image.hm.com/a.jpg?imwidth=2160",
    product_name: "Tie-Belt Twill Jacket",
    url: "https://www2.hm.com/en_us/productpage.1356634001.html?utm_source=test",
    product_code: "1356634001",
    brand: "H&M",
    category: "Blazers & Vests",
    timestamp: "2026-08-17T19:56:57.722Z",
    ...overrides,
  };
}

test("ignores failed rows, deduplicates stable product identity, and preserves source facts", () => {
  const result = normalizeBrightDataHmRecords([
    { error: "timeout", error_code: "wait_element_timeout" },
    record(),
    record({ timestamp: "2026-08-17T20:00:00.000Z" }),
  ]);

  assert.deepEqual(result.stats, { total: 3, successful: 2, failed: 1, products: 1, images: 2 });
  assert.equal(result.rejected.length, 0);
  assert.equal(result.products[0].product.title, "Tie-Belt Twill Jacket");
  assert.equal(result.products[0].product.color_name, "Black");
  assert.equal(result.products[0].product.price_minor, 5999);
  assert.equal(result.products[0].product.original_price_minor, 7999);
  assert.equal(result.products[0].product.canonical_url, "https://www2.hm.com/en_us/productpage.1356634001.html");
  assert.deepEqual(result.products[0].images.map((image) => image.official_cdn_url), [
    "https://image.hm.com/a.jpg?imwidth=2160",
    "https://image.hm.com/b.jpg?imwidth=2160",
  ]);
  assert.deepEqual(result.products[0].variants, []);
});

test("rejects malformed non-error rows without inventing missing data", () => {
  const result = normalizeBrightDataHmRecords([record({ product_code: "" })]);
  assert.equal(result.products.length, 0);
  assert.equal(result.rejected.length, 1);
});
