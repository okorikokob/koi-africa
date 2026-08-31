import assert from "node:assert/strict";
import test from "node:test";
import { multiCurrencyDisplayEnabled } from "@/lib/catalog-feature-flags";
import {
  convertMinorUnits,
  formatConvertedPrice,
  formatCurrencyMinor,
  majorToMinor,
  normalizeDisplayCurrency,
  type DisplayRateSnapshot,
} from "@/lib/display-currency";

const effectiveAt = "2026-08-24T12:00:00.000Z";
const snapshot: DisplayRateSnapshot = {
  anchorCurrency: "USD",
  rates: {
    USD: { rate: "1.000000000000", source: "identity", sourceReference: null, effectiveAt },
    NGN: { rate: "1600.000000000000", source: "test", sourceReference: null, effectiveAt },
    GBP: { rate: "0.787401574803", source: "test", sourceReference: null, effectiveAt },
    EUR: { rate: "0.925925925926", source: "test", sourceReference: null, effectiveAt },
  },
};

test("multi-currency display remains disabled unless explicitly enabled", () => {
  assert.equal(multiCurrencyDisplayEnabled({}), false);
  assert.equal(multiCurrencyDisplayEnabled({ KOI_MULTI_CURRENCY_DISPLAY: "false" }), false);
  assert.equal(multiCurrencyDisplayEnabled({ KOI_MULTI_CURRENCY_DISPLAY: "TRUE" }), false);
  assert.equal(multiCurrencyDisplayEnabled({ KOI_MULTI_CURRENCY_DISPLAY: "true" }), true);
});

test("converts between NGN, USD, GBP, and EUR using integer minor units", () => {
  assert.equal(convertMinorUnits(14_500, "USD", "NGN", snapshot), 23_200_000);
  assert.equal(convertMinorUnits(14_500, "USD", "GBP", snapshot), 11_417);
  assert.equal(convertMinorUnits(14_500, "USD", "EUR", snapshot), 13_426);
  assert.equal(convertMinorUnits(10_000, "GBP", "USD", snapshot), 12_700);
  assert.equal(convertMinorUnits(10_000, "EUR", "USD", snapshot), 10_800);
  assert.equal(convertMinorUnits(16_000_000, "NGN", "USD", snapshot), 10_000);
});

test("formats selected currency without losing the original source amount", () => {
  assert.equal(majorToMinor(145), 14_500);
  assert.equal(formatCurrencyMinor(14_500, "USD"), "$145");
  assert.equal(formatConvertedPrice({
    amount: 145,
    sourceCurrency: "USD",
    targetCurrency: "NGN",
    snapshot,
  }), "₦232,000");
  assert.equal(formatCurrencyMinor(11_417, "GBP"), "£114.17");
  assert.equal(formatCurrencyMinor(13_426, "EUR"), "€134.26");
  assert.equal(snapshot.rates.USD.rate, "1.000000000000");
});

test("fails safely for invalid money, rates, or unsupported currencies", () => {
  assert.equal(majorToMinor(Number.NaN), null);
  assert.equal(majorToMinor(-1), null);
  assert.equal(convertMinorUnits(10_000, "JPY", "USD", snapshot), null);
  assert.equal(normalizeDisplayCurrency("gbp"), "GBP");
  assert.equal(normalizeDisplayCurrency("JPY"), null);
  assert.equal(formatConvertedPrice({
    amount: Number.POSITIVE_INFINITY,
    sourceCurrency: "USD",
    targetCurrency: "EUR",
    snapshot,
  }), null);
});
