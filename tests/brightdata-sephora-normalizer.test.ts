import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBrightDataSephoraRecords } from "../lib/brightdata-sephora-normalizer";

function record(variantId: string, size: string, availability: "in_stock" | "out_of_stock" = "in_stock") {
  return {
    url: `https://www.sephora.com/product/example-P100?skuId=${variantId}`,
    item_id: variantId,
    variant_id: variantId,
    title: "Example Treatment",
    description: "Example description",
    product_category: "Skincare > Treatments",
    category_tree: [{ name: "Skincare", url: "https://www.sephora.com/shop/skincare" }],
    brand: "Jack Black",
    image_url: `https://www.sephora.com/productimages/sku/s${variantId}-main-hero.jpg`,
    price: "$18.00",
    sale_price: null,
    availability,
    group_id: "P100",
    variant_attributes: [{ name: "Size", value: size }],
    store_name: "sephora",
    store_country: "US",
    star_rating: 4.7,
    review_count: 20,
    additional_image_urls: [
      `https://www.sephora.com/productimages/sku/s${variantId}-av-1.jpg?imwidth=250`,
      `https://www.sephora.com/productimages/sku/s${variantId}-av-1.jpg?imwidth=500`,
      "https://photos-us.bazaarvoice.com/photo/customer-upload",
    ],
    timestamp: "2026-08-17T20:22:51.110Z",
  };
}

test("filters productnotcarried rows and groups exact Sephora variants", () => {
  const result = normalizeBrightDataSephoraRecords([
    { url: "https://www.sephora.com/search?keyword=productnotcarried", price: "$100.00" },
    record("111", "1 oz"),
    record("222", "2 oz", "out_of_stock"),
  ]);

  assert.deepEqual(result.stats, { total: 3, invalid: 1, validVariantRows: 2, products: 1, variants: 2, images: 4 });
  assert.equal(result.rejected.length, 0);
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.products[0].product.actual_brand_name, "Jack Black");
  assert.deepEqual(result.products[0].variants.map((variant) => variant.option_values), [{ size: "1 oz" }, { size: "2 oz" }]);
  assert.equal(result.products[0].variants[0].source_item_id, "111");
  assert.ok(result.products[0].images.every((image) => String(image.official_cdn_url).includes("sephora.com/productimages/")));
  assert.ok(result.products[0].images.every((image) => !String(image.official_cdn_url).includes("bazaarvoice")));
});

test("reports conflicting product identity facts", () => {
  const result = normalizeBrightDataSephoraRecords([record("111", "1 oz"), { ...record("222", "2 oz"), brand: "Another Brand" }]);
  assert.equal(result.products.length, 1);
  assert.equal(result.conflicts.length, 1);
});
