import assert from "node:assert/strict";
import test from "node:test";
import type { NikeCatalogReadRow } from "@/database/repositories/nikeCatalogReadRepository";
import { nikePostgresReadsEnabled } from "@/lib/catalog-feature-flags";
import { isPostgresUuid } from "@/lib/postgres-identifiers";
import {
  mapNikePostgresProduct,
  NikePostgresCatalogReader,
  type NikeCatalogRowReader,
} from "@/lib/nike-postgres-product-mapper";

const now = new Date("2026-08-21T12:00:00.000Z");

function row(): NikeCatalogReadRow {
  return {
    brandName: "Nike",
    countryCode: "US",
    colourways: [],
    product: {
      id: "product-uuid",
      storefrontId: "storefront-uuid",
      brandId: "brand-uuid",
      categoryId: null,
      provider: "apify",
      sourceProductId: "nike-product-1",
      styleCode: "STYLE-1",
      canonicalUrl: "https://www.nike.com/us/t/example/STYLE-1",
      title: "Nike Example",
      subtitle: "Road Running Shoes",
      description: "Example description",
      productType: "Shoes",
      department: null,
      gender: "Men",
      currency: "USD",
      priceMinor: 12000,
      compareAtPriceMinor: 15000,
      available: true,
      availabilityStatus: "limited",
      isActive: true,
      weightGrams: null,
      lengthMm: null,
      widthMm: null,
      heightMm: null,
      measurementSource: "unknown",
      firstSeenAt: now,
      lastSeenAt: now,
      lastSyncedAt: now,
      sourceUpdatedAt: now,
      lastSeenSyncRunId: null,
      missingSinceSyncRunId: null,
      deactivatedBySyncRunId: null,
      deactivatedAt: null,
      deactivationReason: null,
      createdAt: now,
      updatedAt: now,
    },
    images: [
      {
        id: "image-2", productId: "product-uuid", colourwayId: null, sourceUrl: "https://static.nike.com/second.jpg",
        altText: null, position: 1, colorName: "Red", sourceUpdatedAt: now, createdAt: now, updatedAt: now,
      },
      {
        id: "image-1", productId: "product-uuid", colourwayId: null, sourceUrl: "https://static.nike.com/first.jpg",
        altText: null, position: 0, colorName: "Red", sourceUpdatedAt: now, createdAt: now, updatedAt: now,
      },
    ],
    variants: [
      {
        id: "variant-row-1",
        productId: "product-uuid",
        colourwayId: null,
        provider: "apify",
        sourceVariantId: "source-variant-red-9",
        sku: "RED-9",
        gtin: null,
        title: null,
        optionValues: { Colour: "Red", Size: "9" },
        currency: "USD",
        priceMinor: 12000,
        compareAtPriceMinor: null,
        available: true,
        availabilityStatus: "limited",
        isActive: true,
        weightGrams: null,
        lengthMm: null,
        widthMm: null,
        heightMm: null,
        measurementSource: "unknown",
        lastSeenAt: now,
        sourceUpdatedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "variant-row-2",
        productId: "product-uuid",
        colourwayId: null,
        provider: "apify",
        sourceVariantId: "source-variant-blue-10",
        sku: null,
        gtin: null,
        title: null,
        optionValues: { Colour: "Blue", Size: "10" },
        currency: "USD",
        priceMinor: 12500,
        compareAtPriceMinor: null,
        available: false,
        availabilityStatus: "unknown",
        isActive: true,
        weightGrams: null,
        lengthMm: null,
        widthMm: null,
        heightMm: null,
        measurementSource: "unknown",
        lastSeenAt: now,
        sourceUpdatedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

test("maps PostgreSQL Nike catalogue data without losing gallery, money, identity, or availability", () => {
  const result = mapNikePostgresProduct(row());
  assert.ok(result.product);
  assert.equal(result.product.id, "product-uuid");
  assert.deepEqual(result.product.allImages, [
    "https://static.nike.com/first.jpg",
    "https://static.nike.com/second.jpg",
  ]);
  assert.equal(result.product.priceAmount, 120);
  assert.equal(result.product.compareAtPriceAmount, 150);
  assert.equal(result.product.priceCurrency, "USD");
  assert.equal(result.product.availabilityStatus, "limited");
  assert.equal(result.product.variants?.[0].id, "source-variant-red-9");
  assert.equal(result.product.variants?.[0].availabilityStatus, "limited");
  assert.equal(result.product.variants?.length, 1);
  assert.deepEqual(result.product.colorImageSets, {
    Red: ["https://static.nike.com/first.jpg", "https://static.nike.com/second.jpg"],
  });
  assert.deepEqual(result.product.options, [
    { name: "Colour", values: ["Red"] },
    { name: "Size", values: ["9"] },
  ]);
});

test("does not expose colours or variants without a verified gallery", () => {
  const result = mapNikePostgresProduct(row());
  assert.ok(result.product);
  assert.deepEqual(result.product.options?.find((option) => option.name === "Colour")?.values, ["Red"]);
  assert.deepEqual(result.product.variants?.map((variant) => variant.id), ["source-variant-red-9"]);
  assert.equal(result.product.variants?.some((variant) =>
    variant.options.some((option) => option.label === "Blue")
  ), false);
});

test("maps verified styleColor colourways to separate galleries and exact variants", () => {
  const input = row();
  input.colourways = [
    {
      id: "colourway-red", productId: "product-uuid", provider: "apify",
      styleColor: "STYLE-RED", colour: "Red", canonicalUrl: input.product.canonicalUrl,
      currency: "USD", priceMinor: 12000, compareAtPriceMinor: 15000,
      available: true, availabilityStatus: "limited", primaryImageUrl: "https://static.nike.com/red-front.jpg",
      position: 0, isActive: true, lastSeenAt: now, sourceUpdatedAt: now, createdAt: now, updatedAt: now,
    },
    {
      id: "colourway-blue", productId: "product-uuid", provider: "apify",
      styleColor: "STYLE-BLUE", colour: "Blue", canonicalUrl: input.product.canonicalUrl,
      currency: "USD", priceMinor: 12500, compareAtPriceMinor: null,
      available: false, availabilityStatus: "unknown", primaryImageUrl: "https://static.nike.com/blue-front.jpg",
      position: 1, isActive: true, lastSeenAt: now, sourceUpdatedAt: now, createdAt: now, updatedAt: now,
    },
  ];
  input.images = [
    { ...input.images[0], id: "red-1", colourwayId: "colourway-red", sourceUrl: "https://static.nike.com/red-front.jpg", colorName: "Red", position: 0 },
    { ...input.images[0], id: "red-2", colourwayId: "colourway-red", sourceUrl: "https://static.nike.com/red-back.jpg", colorName: "Red", position: 1 },
    { ...input.images[0], id: "blue-1", colourwayId: "colourway-blue", sourceUrl: "https://static.nike.com/blue-front.jpg", colorName: "Blue", position: 0 },
    { ...input.images[0], id: "blue-2", colourwayId: "colourway-blue", sourceUrl: "https://static.nike.com/blue-back.jpg", colorName: "Blue", position: 1 },
  ];
  input.variants[0].colourwayId = "colourway-red";
  input.variants[1].colourwayId = "colourway-blue";

  const result = mapNikePostgresProduct(input);
  assert.ok(result.product);
  assert.deepEqual(result.product.colourways?.map((colourway) => colourway.styleColor), ["STYLE-RED", "STYLE-BLUE"]);
  assert.deepEqual(result.product.colourways?.[0].images, [
    "https://static.nike.com/red-front.jpg",
    "https://static.nike.com/red-back.jpg",
  ]);
  assert.deepEqual(result.product.colourways?.[1].images, [
    "https://static.nike.com/blue-front.jpg",
    "https://static.nike.com/blue-back.jpg",
  ]);
  assert.deepEqual(result.product.allImages, result.product.colourways?.[0].images);
  assert.equal(result.product.variants?.[0].styleColor, "STYLE-RED");
  assert.equal(result.product.variants?.[1].styleColor, "STYLE-BLUE");
  assert.equal(result.product.colourways?.[1].availabilityStatus, "unknown");
});

test("rejects missing galleries and ambiguous required variants", () => {
  const missingGallery = row();
  missingGallery.images = [];
  assert.equal(mapNikePostgresProduct(missingGallery).reason, "missing_images");

  const ambiguous = row();
  ambiguous.variants[0].optionValues = {};
  ambiguous.variants[1].optionValues = {};
  assert.equal(mapNikePostgresProduct(ambiguous).reason, "ambiguous_required_variants");

  const unverified = row();
  unverified.images = unverified.images.map((image) => ({ ...image, colorName: null }));
  assert.equal(mapNikePostgresProduct(unverified).reason, "missing_verified_colour_gallery");
});

test("looks up an exact PostgreSQL product and fails closed for unsafe or unknown IDs", async () => {
  const safe = row();
  const unsafe = row();
  unsafe.product.id = "unsafe-product";
  unsafe.images = [];
  const repository: NikeCatalogRowReader = {
    async listProducts() { return [safe, unsafe]; },
    async findProductById(id) {
      return [safe, unsafe].find((candidate) => candidate.product.id === id) ?? null;
    },
  };
  const reader = new NikePostgresCatalogReader(repository);
  assert.equal((await reader.findProductById("product-uuid"))?.title, "Nike Example");
  assert.equal(await reader.findProductById("unsafe-product"), null);
  assert.equal(await reader.findProductById("missing"), null);
  assert.deepEqual((await reader.listProducts()).map((product) => product.id), ["product-uuid"]);
});

test("keeps PostgreSQL Nike reads disabled unless explicitly true", () => {
  assert.equal(nikePostgresReadsEnabled({}), false);
  assert.equal(nikePostgresReadsEnabled({ KOI_NIKE_POSTGRES_READS: "false" }), false);
  assert.equal(nikePostgresReadsEnabled({ KOI_NIKE_POSTGRES_READS: "true" }), true);
});

test("only routes PostgreSQL UUID identities into the Nike database lookup", () => {
  assert.equal(isPostgresUuid("9810eb6a-e084-4cf1-a6c5-aeb0274890c8"), true);
  assert.equal(isPostgresUuid("06a231e8-425d-5561-a802-3ed21ac57516"), true);
  assert.equal(isPostgresUuid("local-nike-jxmxgh"), false);
  assert.equal(isPostgresUuid("local-sephora-p107319"), false);
  assert.equal(isPostgresUuid("product-uuid"), false);
  assert.equal(isPostgresUuid(""), false);
});
