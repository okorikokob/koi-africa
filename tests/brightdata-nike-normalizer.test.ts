import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBrightDataNikeRecords } from "../lib/brightdata-nike-normalizer";

function record(variantId: string, size: string, gtin: string) {
  return {
    url: "https://www.nike.com/t/example-product-group123",
    item_id: "item-1",
    variant_id: variantId,
    title: "Nike Example Shoe",
    description: "Example description",
    product_category: "Men > Shoes",
    category_tree: [{ name: "Men", url: "https://www.nike.com/men" }],
    brand: "Nike",
    image_url: "https://static.nike.com/a/example.png",
    price: "$100.00",
    sale_price: "$80.00",
    availability: "in_stock",
    group_id: "group123",
    variant_attributes: [
      { name: "Color", value: "Black/White" },
      { name: "Size", value: size },
      { name: "Style", value: "AB1234-001" },
    ],
    variants: [],
    store_name: "nike.com",
    store_country: "US",
    star_rating: 4.5,
    review_count: 12,
    additional_image_urls: ["https://static.nike.com/a/example-2.png"],
    gtin,
    mpn: "AB1234-001",
    timestamp: "2026-08-17T13:25:46.466Z",
  };
}

test("coalesces variant rows without losing purchasing identity", () => {
  const result = normalizeBrightDataNikeRecords([
    record("variant-small", "S", "001"),
    record("variant-medium", "M", "002"),
    record("variant-small", "S", "001"),
  ]);
  assert.deepEqual(result.stats, { received: 3, products: 1, variants: 2, images: 2, preorders: 0 });
  assert.equal(result.rejected.length, 0);
  assert.equal(result.conflicts.length, 0);
  assert.deepEqual(result.products[0].variants[0].option_values, { color: "Black/White", size: "S" });
  assert.equal(result.products[0].variants[0].gtin, "001");
  assert.equal(result.products[0].product.sale_price_minor, 8000);
});

test("rejects non-US storefront records", () => {
  const invalid = { ...record("variant-small", "S", "001"), store_country: "GB" };
  const result = normalizeBrightDataNikeRecords([invalid]);
  assert.equal(result.products.length, 0);
  assert.equal(result.rejected.length, 1);
});
