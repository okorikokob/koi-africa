import assert from "node:assert/strict";
import test from "node:test";
import { apifyNikeProductRecordSchema } from "@/lib/catalog-ingestion-schema";
import { mapNikeProductRecord } from "@/lib/nike-catalog-mapper";

function record() {
  return apifyNikeProductRecordSchema.parse({
    storefront: "nike-us",
    brand: "Nike",
    sourceProductId: "nike-123",
    styleCode: "ABC-100",
    canonicalUrl: "https://www.nike.com/us/t/example/ABC-100",
    title: "Example Nike Shoe",
    currentPrice: 129.95,
    originalPrice: 159.99,
    currency: "usd",
    images: [
      { url: "https://static.nike.com/a/images/example.jpg", alt: "Example" },
      { url: "https://static.nike.com/a/images/example-2.jpg" },
    ],
    variants: [
      { id: "ABC-100-RED-9", sku: "RED-9", colour: "Red", size: "9", currentPrice: 119.5, availability: "limited" },
      { id: "ABC-100-BLUE-10", colour: "Blue", size: "10", currentPrice: null, availability: "unknown" },
    ],
    availability: "unknown",
    attributes: { colorDescription: "Red" },
    scrapedAt: "2026-08-20T12:30:00.000Z",
  });
}

test("maps Nike prices to integer minor units and preserves explicit identities", () => {
  const mapped = mapNikeProductRecord(record());
  assert.equal(mapped.sourceProductId, "nike-123");
  assert.equal(mapped.product.price_minor, 15999);
  assert.equal(mapped.product.sale_price_minor, 12995);
  assert.deepEqual(mapped.images.map((image) => image.official_cdn_url), [
    "https://static.nike.com/a/images/example.jpg",
    "https://static.nike.com/a/images/example-2.jpg",
  ]);
  assert.ok(mapped.images.every((image) => image.color_name === "Red"));
  assert.deepEqual(mapped.variants.map((variant) => variant.source_variant_id), [
    "ABC-100-RED-9",
    "ABC-100-BLUE-10",
  ]);
  assert.equal(mapped.variants[0].price_minor, 11950);
  assert.equal(mapped.variants[1].price_minor, 12995);
  assert.deepEqual(mapped.variants[0].option_values, { Colour: "Red", Size: "9" });
});

test("does not assign a gallery to an unverified source colour", () => {
  const input = record();
  input.attributes = { colorDescription: "Green" };
  assert.ok(mapNikeProductRecord(input).images.every((image) => image.color_name === null));
});

test("keeps unknown unavailable, preserves limited distinctly, and preserves source freshness", () => {
  const mapped = mapNikeProductRecord(record());
  assert.equal(mapped.product.availability_status, "unknown");
  assert.equal(mapped.product.available, false);
  assert.equal(mapped.variants[0].availability_status, "limited");
  assert.equal(mapped.variants[0].available, true);
  assert.equal(mapped.variants[1].availability_status, "unknown");
  assert.equal(mapped.variants[1].available, false);
  assert.equal(mapped.product.source_updated_at, "2026-08-20T12:30:00.000Z");
  assert.ok(mapped.images.every((image) => image.source_updated_at === "2026-08-20T12:30:00.000Z"));
});

test("preserves verified colourway identity, galleries, money, and exact variants", () => {
  const input = record();
  input.colourways = [
    {
      styleColor: "ABC-100-600",
      colour: "Red",
      canonicalUrl: input.canonicalUrl,
      currentPrice: 119.5,
      originalPrice: 159.99,
      currency: "USD",
      availability: "limited",
      primaryImage: "https://static.nike.com/a/images/red-front.jpg",
      images: [
        { url: "https://static.nike.com/a/images/red-front.jpg", alt: "Red front" },
        { url: "https://static.nike.com/a/images/red-back.jpg", alt: "Red back" },
      ],
      variants: [
        {
          id: "exact-red-9",
          sku: "ABC-100-600",
          gtin: "00123456789012",
          colour: "Red",
          size: "9",
          currentPrice: 119.5,
          availability: "limited",
        },
      ],
    },
    {
      styleColor: "ABC-100-400",
      colour: "Blue",
      canonicalUrl: input.canonicalUrl,
      currentPrice: 129.95,
      originalPrice: null,
      currency: "USD",
      availability: "unknown",
      primaryImage: "https://static.nike.com/a/images/blue-front.jpg",
      images: [{ url: "https://static.nike.com/a/images/blue-front.jpg", alt: "Blue front" }],
      variants: [
        {
          id: "exact-blue-10",
          sku: "ABC-100-400",
          gtin: "00123456789013",
          colour: "Blue",
          size: "10",
          currentPrice: null,
          availability: "unknown",
        },
      ],
    },
  ];

  const mapped = mapNikeProductRecord(input);
  assert.deepEqual(mapped.colourways.map((colourway) => colourway.style_color), ["ABC-100-600", "ABC-100-400"]);
  assert.deepEqual(mapped.images.map((image) => [image.style_color, image.official_cdn_url]), [
    ["ABC-100-600", "https://static.nike.com/a/images/red-front.jpg"],
    ["ABC-100-600", "https://static.nike.com/a/images/red-back.jpg"],
    ["ABC-100-400", "https://static.nike.com/a/images/blue-front.jpg"],
  ]);
  assert.deepEqual(mapped.variants.map((variant) => [variant.style_color, variant.source_variant_id]), [
    ["ABC-100-600", "exact-red-9"],
    ["ABC-100-400", "exact-blue-10"],
  ]);
  assert.equal(mapped.variants[0].sku, "ABC-100-600");
  assert.equal(mapped.variants[0].gtin, "00123456789012");
  assert.equal(mapped.colourways[0].price_minor, 15999);
  assert.equal(mapped.colourways[0].sale_price_minor, 11950);
  assert.equal(mapped.colourways[1].availability_status, "unknown");
  assert.equal(mapped.colourways[1].available, false);
});
