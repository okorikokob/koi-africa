import assert from "node:assert/strict";
import test from "node:test";
import { getLocalSephoraProducts } from "../lib/local-sephora-catalog";
import {
  getAvailableProductOptionValues,
  getInitialProductColour,
  normalizeProductOptionName,
  resolveProductVariant,
} from "../lib/product-variant-selection";
import type { ProductVariant } from "@/types";

function nikeVariant(
  id: string,
  colour: string,
  size: string,
  available: boolean,
  styleColor?: string,
): ProductVariant {
  return {
    id,
    styleColor,
    checkoutUrl: "https://www.nike.com/example",
    productUrl: "https://www.nike.com/example",
    available,
    availabilityStatus: available ? "in_stock" : "out_of_stock",
    price: 100,
    currency: "USD",
    options: [{ name: "Colour", label: colour }, { name: "Size", label: size }],
    imageUrl: "https://static.nike.com/example.jpg",
  };
}

test("a Sephora size selection resolves the exact authoritative variant", () => {
  process.env.USE_LOCAL_SEPHORA_CATALOG = "true";
  const product = getLocalSephoraProducts().find((candidate) => candidate.id === "local-sephora-P12569");
  assert.ok(product?.variants);
  const variant = resolveProductVariant(product.variants, { size: "16 oz/473 mL" });
  assert.equal(variant?.id, "1222371");
  assert.equal(variant?.sku, "1222371");
  assert.equal(variant?.price, 35);
  assert.equal(variant?.available, true);
  delete process.env.USE_LOCAL_SEPHORA_CATALOG;
});

test("multiple source variants without distinguishing options stay unresolved", () => {
  const variant = resolveProductVariant([
    { id: "one", checkoutUrl: "https://example.com", productUrl: "https://example.com", available: true, price: 10, currency: "USD", options: [], imageUrl: "" },
    { id: "two", checkoutUrl: "https://example.com", productUrl: "https://example.com", available: true, price: 12, currency: "USD", options: [], imageUrl: "" },
  ], {});
  assert.equal(variant, null);
});

test("normalizes color and colour and resolves the exact source variant", () => {
  const variants = [
    nikeVariant("black-9", "Black", "9", true),
    nikeVariant("burgundy-9", "Burgundy", "9", true),
  ];
  assert.equal(normalizeProductOptionName("Colour"), "color");
  assert.equal(resolveProductVariant(variants, { color: "Burgundy", size: "9" })?.id, "burgundy-9");
  assert.equal(resolveProductVariant(variants, { colour: "Black", size: "9" })?.id, "black-9");
});

test("filters available sizes by selected colour and excludes unavailable combinations", () => {
  const variants = [
    nikeVariant("black-8", "Black", "8", true),
    nikeVariant("black-9", "Black", "9", false),
    nikeVariant("burgundy-9", "Burgundy", "9", true),
  ];
  assert.deepEqual([...getAvailableProductOptionValues(variants, "Size", { color: "Black" })], ["8"]);
  assert.deepEqual([...getAvailableProductOptionValues(variants, "Size", { colour: "Burgundy" })], ["9"]);
  const unavailable = resolveProductVariant(variants, { color: "Black", size: "9" });
  assert.equal(unavailable?.id, "black-9");
  assert.equal(unavailable?.available, false);
});

test("uses the verified gallery colour as the initial visible selection", () => {
  assert.equal(getInitialProductColour(
    ["Black", "Burgundy"],
    { Burgundy: ["https://static.nike.com/burgundy.jpg"] },
  ), "Burgundy");
  assert.equal(getInitialProductColour(["Black", "Burgundy"], {}), "Black");
});

test("uses styleColor to resolve duplicate visible colour names without identity collisions", () => {
  const variants = [
    nikeVariant("first-black-9", "Black", "9", true, "STYLE-001"),
    nikeVariant("second-black-9", "Black", "9", true, "STYLE-002"),
  ];
  assert.equal(resolveProductVariant(variants, {
    styleColor: "STYLE-002",
    color: "Black",
    size: "9",
  })?.id, "second-black-9");
  assert.deepEqual(
    [...getAvailableProductOptionValues(variants, "Size", { styleColor: "STYLE-001" })],
    ["9"],
  );
});
