import assert from "node:assert/strict";
import test from "node:test";
import {
  getEnabledHomepageDemoBrands,
  prioritizeHomepageBrands,
  prioritizeHomepageProducts,
} from "../lib/homepage-catalog";
import type { Brand, Product } from "../types";

function brand(name: string, slug: string): Brand {
  return { id: slug, name, slug, logoUrl: "", description: "", category: "test", isFeatured: true };
}

function product(id: string, vendorName: string): Product {
  return {
    id,
    title: id,
    brandName: vendorName,
    category: "test",
    imageUrl: "https://example.com/image.jpg",
    priceAmount: 1,
    priceCurrency: "USD",
    vendorName,
    vendorUrl: "https://example.com",
    isFeatured: true,
  };
}

test("enabled demo flags collapse into Nike, H&M, Sephora order without gaps", () => {
  assert.deepEqual(
    getEnabledHomepageDemoBrands({
      USE_LOCAL_NIKE_CATALOG: "true",
      USE_LOCAL_SEPHORA_CATALOG: "true",
    }),
    ["nike", "sephora"],
  );
});

test("homepage brand cards prioritize enabled demos and preserve remaining order", () => {
  const brands = [brand("Zara", "zara"), brand("Sephora", "sephora"), brand("Nike", "nike"), brand("H&M", "hm"), brand("Apple", "apple")];
  assert.deepEqual(
    prioritizeHomepageBrands(brands, ["nike", "hm", "sephora"]).map((item) => item.slug),
    ["nike", "hm", "sephora", "zara", "apple"],
  );
});

test("homepage products use one product per enabled demo before existing products", () => {
  const products = [product("zara-1", "Zara"), product("sephora-1", "Sephora"), product("nike-1", "Nike"), product("nike-2", "Nike"), product("hm-1", "H&M")];
  assert.deepEqual(
    prioritizeHomepageProducts(products, ["nike", "hm", "sephora"], 5).map((item) => item.id),
    ["nike-1", "hm-1", "sephora-1", "zara-1", "nike-2"],
  );
});
