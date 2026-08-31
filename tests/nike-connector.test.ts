import assert from "node:assert/strict";
import test from "node:test";
import type { BrightDataNikeRecord } from "../lib/brightdata-nike-schema";
import { NikeConnector } from "../lib/connectors/nike/connector";
import { BrightDataNikeOfficialSourceClient } from "../lib/connectors/nike/official-source";
import { BrandConnectorRegistry } from "../lib/connectors/registry";
import { ConnectorRevalidationError } from "../lib/connectors/types";
import { getLocalNikeProducts } from "../lib/local-nike-catalog";
import { preflightPaymentItem } from "../lib/payment-item-preflight";
import type { Product, ProductVariant } from "../types";

process.env.USE_LOCAL_NIKE_CATALOG = "true";

function nikeSelection(): { product: Product; variant: ProductVariant } {
  const product = getLocalNikeProducts()[0];
  const variant = product.variants?.find((candidate) => candidate.available && candidate.price === 95);
  assert.ok(product);
  assert.ok(variant);
  return { product, variant };
}

function liveRecord(
  product: Product,
  variant: ProductVariant,
  overrides: Partial<BrightDataNikeRecord> = {},
): BrightDataNikeRecord {
  const values = Object.fromEntries(variant.options.map((option) => [option.name.toLowerCase(), option.label]));
  return {
    url: product.productPageUrl ?? product.vendorUrl,
    item_id: variant.id,
    variant_id: variant.id,
    title: product.title,
    description: product.description ?? "",
    product_category: product.category,
    category_tree: [],
    brand: "Nike",
    image_url: product.imageUrl,
    price: `$${variant.price.toFixed(2)}`,
    sale_price: null,
    availability: "in_stock",
    group_id: product.id.replace(/^local-nike-/, ""),
    variant_attributes: Object.entries(values).map(([name, value]) => ({ name, value })),
    variants: [],
    store_name: "Nike US",
    store_country: "US",
    review_count: 0,
    additional_image_urls: [],
    gtin: variant.gtin!,
    mpn: variant.sku!,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function connectorFor(record: BrightDataNikeRecord): NikeConnector {
  return new NikeConnector({ fetchVariant: async () => record });
}

async function rejectsWithCode(operation: () => Promise<unknown>, code: ConnectorRevalidationError["code"]): Promise<void> {
  await assert.rejects(operation, (error: unknown) => error instanceof ConnectorRevalidationError && error.code === code);
}

test("Nike connector exposes the existing local catalogue", () => {
  const connector = new NikeConnector({ fetchVariant: async () => { throw new Error("unused"); } });
  assert.equal(connector.getProducts().length, 100);
  assert.equal(connector.getProductById(nikeSelection().product.id)?.brandName, "Nike");
});

test("registry selects Nike without embedding Nike logic in payment preflight", () => {
  const { product, variant } = nikeSelection();
  const connector = connectorFor(liveRecord(product, variant));
  const registry = new BrandConnectorRegistry([connector]);
  assert.equal(registry.forProduct(product), connector);
  assert.equal(registry.forProduct({ ...product, id: "other", brandName: "Other" }), null);
});

test("registry cannot bypass Nike revalidation when an official URL is malformed", async () => {
  const { product, variant } = nikeSelection();
  const malformed = { ...product, productPageUrl: "https://example.com/not-nike" };
  const connector = connectorFor(liveRecord(product, variant));
  const registry = new BrandConnectorRegistry([connector]);
  assert.equal(registry.forProduct(malformed), connector);
  await rejectsWithCode(
    () => preflightPaymentItem(malformed, variant.id, registry),
    "product_identity_mismatch",
  );
});

test("Nike connector revalidates exact official product and variant evidence", async () => {
  const { product, variant } = nikeSelection();
  const result = await connectorFor(liveRecord(product, variant)).revalidateVariant({ product, variant });
  assert.equal(result.productId, product.id);
  assert.equal(result.variantId, variant.id);
  assert.equal(result.sku, variant.sku);
  assert.equal(result.gtin, variant.gtin);
  assert.equal(result.price, variant.price);
  assert.equal(result.available, true);
});

test("payment preflight uses injected live Nike evidence", async () => {
  const { product, variant } = nikeSelection();
  const registry = new BrandConnectorRegistry([connectorFor(liveRecord(product, variant))]);
  const result = await preflightPaymentItem(product, variant.id, registry);
  assert.equal(result.variant?.id, variant.id);
  assert.equal(result.price, variant.price);
  assert.equal(result.currency, "USD");
});

test("Nike checkout fails closed when live configuration is missing", async () => {
  const previousToken = process.env.BRIGHTDATA_API_TOKEN;
  const previousDataset = process.env.BRIGHTDATA_NIKE_DATASET_ID;
  delete process.env.BRIGHTDATA_API_TOKEN;
  delete process.env.BRIGHTDATA_NIKE_DATASET_ID;
  const { product, variant } = nikeSelection();
  try {
    await rejectsWithCode(
      () => new NikeConnector(new BrightDataNikeOfficialSourceClient()).revalidateVariant({ product, variant }),
      "configuration_unavailable",
    );
  } finally {
    if (previousToken === undefined) delete process.env.BRIGHTDATA_API_TOKEN;
    else process.env.BRIGHTDATA_API_TOKEN = previousToken;
    if (previousDataset === undefined) delete process.env.BRIGHTDATA_NIKE_DATASET_ID;
    else process.env.BRIGHTDATA_NIKE_DATASET_ID = previousDataset;
  }
});

test("Nike checkout fails closed without an exact selected variant", async () => {
  const { product } = nikeSelection();
  const registry = new BrandConnectorRegistry([new NikeConnector({ fetchVariant: async () => { throw new Error("unused"); } })]);
  await rejectsWithCode(() => preflightPaymentItem(product, undefined, registry), "variant_identity_mismatch");
});

test("Nike checkout rejects unavailable, mismatched, and repriced live evidence", async () => {
  const { product, variant } = nikeSelection();
  await rejectsWithCode(
    () => connectorFor(liveRecord(product, variant, { availability: "out_of_stock" })).revalidateVariant({ product, variant }),
    "variant_unavailable",
  );
  await rejectsWithCode(
    () => connectorFor(liveRecord(product, variant, { gtin: "mismatch" })).revalidateVariant({ product, variant }),
    "variant_identity_mismatch",
  );
  await rejectsWithCode(
    () => connectorFor(liveRecord(product, variant, { price: "$1.00" })).revalidateVariant({ product, variant }),
    "price_changed",
  );
  await rejectsWithCode(
    () => connectorFor(liveRecord(product, variant, { variant_attributes: [{ name: "size", value: "wrong" }] })).revalidateVariant({ product, variant }),
    "variant_identity_mismatch",
  );
  await rejectsWithCode(
    () => connectorFor(liveRecord(product, variant, { url: "https://www.nike.com/t/not-the-product" })).revalidateVariant({ product, variant }),
    "product_identity_mismatch",
  );
});
