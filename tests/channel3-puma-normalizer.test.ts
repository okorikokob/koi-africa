import assert from "node:assert/strict";
import test from "node:test";
import type { Channel3Api } from "@channel3/sdk";
import { normalizeChannel3PumaProduct } from "../lib/channel3-puma-normalizer";

function product(overrides: Partial<Channel3Api.Product> = {}): Channel3Api.Product {
  return {
    id: "puma-1",
    title: "Puma Test Runner",
    brands: [{ id: "brand-puma", name: "Puma" }],
    images: [{ url: "https://images.example.com/puma.jpg", is_main_image: true }],
    category: { slug: "shoes", title: "Shoes", has_children: false },
    offers: [{
      url: "https://merchant.example.com/puma",
      domain: "us.puma.com",
      availability: "InStock",
      price: { price: 80, compare_at_price: 100, currency: "USD" },
    }],
    ...overrides,
  };
}

test("normalizes a valid Puma offer without changing KOI pricing", () => {
  const result = normalizeChannel3PumaProduct(product());
  assert.ok(result.product);
  assert.equal(result.product.sourceProductId, "puma-1");
  assert.equal(result.product.product.price_minor, 10_000);
  assert.equal(result.product.product.sale_price_minor, 8_000);
  assert.equal(result.product.product.currency, "USD");
  assert.equal(result.product.product.canonical_url, "https://merchant.example.com/puma");
  assert.equal(result.product.product.merchant_domain, "us.puma.com");
});

test("preserves an exact selected Channel3 variant", () => {
  const result = normalizeChannel3PumaProduct(product({
    variants: {
      options: [{ name: "Size", values: [{ label: "10", exists: true, available: "InStock" }] }],
      selected: [{ name: "Size", label: "10" }],
    },
  }));
  assert.ok(result.product);
  assert.deepEqual(result.product.variants[0].option_values, { Size: "10" });
});

test("rejects variant dimensions without an exact selected combination", () => {
  const result = normalizeChannel3PumaProduct(product({
    variants: {
      options: [{ name: "Size", values: [{ label: "10", exists: true }] }],
      selected: [],
    },
  }));
  assert.equal(result.reason, "ambiguous_variants");
});

test("rejects products without a usable in-stock offer", () => {
  const result = normalizeChannel3PumaProduct(product({
    offers: [{
      url: "https://merchant.example.com/puma",
      domain: "us.puma.com",
      availability: "OutOfStock",
      price: { price: 80, currency: "USD" },
    }],
  }));
  assert.equal(result.reason, "missing_offer");
});

test("rejects otherwise valid offers from third-party Puma merchants", () => {
  const result = normalizeChannel3PumaProduct(product({
    offers: [{
      url: "https://merchant.example.com/puma",
      domain: "merchant.example.com",
      availability: "InStock",
      price: { price: 80, currency: "USD" },
    }],
  }));
  assert.equal(result.reason, "missing_offer");
});
