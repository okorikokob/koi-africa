import assert from "node:assert/strict";
import test from "node:test";
import {
  filterPublicStorefrontProducts,
  isHiddenPublicBrand,
  isPubliclyShoppableBrand,
  partitionMarketplaceBrands,
} from "../lib/public-storefront-policy";
import type { Brand, Product } from "../types";

function brand(name: string, slug: string): Brand {
  return { id: slug, name, slug, logoUrl: "", description: "", category: "test", isFeatured: true };
}

function product(id: string, brandName: string): Product {
  return {
    id,
    title: id,
    brandName,
    category: "test",
    imageUrl: "https://example.com/image.jpg",
    priceAmount: 1,
    priceCurrency: "USD",
    vendorName: brandName,
    vendorUrl: "https://example.com",
    isFeatured: true,
  };
}

test("Nike is the only publicly shoppable pilot brand", () => {
  assert.equal(isPubliclyShoppableBrand("Nike"), true);
  assert.equal(isPubliclyShoppableBrand("nike"), true);
  assert.equal(isPubliclyShoppableBrand("H&M"), false);
  assert.equal(isPubliclyShoppableBrand("Sephora"), false);
  assert.equal(isPubliclyShoppableBrand("Zara"), false);
});

test("H&M and Sephora identities are hidden from the public marketplace", () => {
  for (const identity of ["H&M", "hm", "h-m", "h-and-m", "Sephora", "sephora"]) {
    assert.equal(isHiddenPublicBrand(identity), true, `${identity} should be hidden`);
  }
});

test("marketplace partition keeps Nike first and excludes misleading brands", () => {
  const result = partitionMarketplaceBrands([
    brand("Zara", "zara"),
    brand("Sephora", "sephora"),
    brand("Nike", "nike"),
    brand("H&M", "hm"),
    brand("Apple", "apple"),
  ]);

  assert.deepEqual(result.available.map((item) => item.slug), ["nike"]);
  assert.deepEqual(result.comingSoon.map((item) => item.slug), ["zara", "apple"]);
});

test("public product filtering cannot expose unverified brand products", () => {
  const products = [
    product("sephora-1", "Sephora"),
    product("nike-1", "Nike"),
    product("hm-1", "H&M"),
    product("nike-2", "nike"),
  ];

  assert.deepEqual(filterPublicStorefrontProducts(products).map((item) => item.id), ["nike-1", "nike-2"]);
});
