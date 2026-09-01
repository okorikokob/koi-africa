import assert from "node:assert/strict";
import test from "node:test";
import {
  persistVerifiedPurchase,
  type PaidItemInput,
  type PersistedPurchase,
  type ResolvedItem,
  type VerifiedPurchaseInput,
  type VerifiedPurchaseStore,
} from "@/lib/payment-persistence";

const rateSnapshot = {
  anchorCurrency: "USD",
  rates: { USD: { rate: "1" }, NGN: { rate: "1600" }, GBP: { rate: "0.78" }, EUR: { rate: "0.92" } },
};
const item: PaidItemInput = {
  productId: "11111111-1111-4111-8111-111111111111",
  variantId: "nike-source-variant-9",
  sku: "SKU-9",
  gtin: "GTIN-9",
  selectedOptions: [{ name: "Size", value: "9" }],
  title: "Nike Test",
  vendorName: "Nike",
  vendorUrl: "https://nike.com/test",
  sourceCurrency: "USD",
  sourceUnitPriceMinor: 7_102,
  acquisitionUnitMinor: 11_363_200,
  serviceMarginUnitMinor: 1_136_320,
  sellingUnitMinor: 12_499_520,
  exchangeRateSnapshot: rateSnapshot,
  qty: 1,
};
const input: VerifiedPurchaseInput = {
  providerReference: "KOI-TEST01", orderReference: "KOI-ORDER1",
  customerName: "Test Customer", customerEmail: "test@example.com", customerPhone: "08000000000",
  deliveryAddress: "1 Test Street", deliveryCity: "Abuja", deliveryRegion: "FCT", deliveryLandmark: null,
  acquisitionSubtotalMinor: item.acquisitionUnitMinor,
  serviceMarginMinor: item.serviceMarginUnitMinor,
  sellingSubtotalMinor: item.sellingUnitMinor,
  logisticsDepositMinor: 3_000_000,
  customsTotalMinor: 0,
  firstPaymentTotalMinor: 15_499_520,
  exchangeRateSnapshot: rateSnapshot,
  channel: "card", items: [item],
};
const resolved: ResolvedItem = {
  ...item,
  internalProductId: item.productId,
  internalVariantId: "22222222-2222-4222-8222-222222222222",
  sourceProductId: "nike-source-product-1",
  sourceVariantId: "nike-source-variant-9",
  brandName: "Nike",
  imageUrl: "https://static.nike.com/test.jpg",
};

class FakeStore implements VerifiedPurchaseStore {
  purchases = new Map<string, PersistedPurchase>();
  createCalls = 0;
  failNext = false;
  snapshots: ResolvedItem[][] = [];
  async findByProviderReference(reference: string) { return this.purchases.get(reference) ?? null; }
  async resolveItems() { return [resolved]; }
  async createAtomic(value: VerifiedPurchaseInput, items: ResolvedItem[]) {
    this.createCalls += 1;
    if (this.failNext) { this.failNext = false; throw new Error("transaction rolled back"); }
    if (this.purchases.has(value.providerReference)) {
      const conflict = new Error("duplicate") as Error & { code: string };
      conflict.code = "23505";
      throw conflict;
    }
    const purchase = {
      orderId: "order-1", orderReference: value.orderReference, totalMinor: value.firstPaymentTotalMinor,
      items: items.map((candidate) => ({ title: candidate.title, qty: candidate.qty, image: candidate.imageUrl })),
    };
    this.snapshots.push(items);
    this.purchases.set(value.providerReference, purchase);
    return purchase;
  }
  isProviderReferenceConflict(error: unknown) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
  }
}

test("successful verification persists one atomic first payment in minor units", async () => {
  const store = new FakeStore();
  const purchase = await persistVerifiedPurchase(input, store);
  assert.equal(purchase.totalMinor, 15_499_520);
  assert.equal(store.createCalls, 1);
});
test("duplicate verification reuses the existing order and payment", async () => {
  const store = new FakeStore();
  const first = await persistVerifiedPurchase(input, store);
  const second = await persistVerifiedPurchase({ ...input, orderReference: "KOI-ORDER2" }, store);
  assert.deepEqual(second, first);
  assert.equal(store.createCalls, 1);
});
test("concurrent verification resolves the provider-reference conflict to one purchase", async () => {
  const store = new FakeStore();
  const [first, second] = await Promise.all([
    persistVerifiedPurchase(input, store),
    persistVerifiedPurchase({ ...input, orderReference: "KOI-ORDER2" }, store),
  ]);
  assert.equal(first.orderId, second.orderId);
  assert.equal(store.purchases.size, 1);
});
test("transaction failure remains recoverable on retry", async () => {
  const store = new FakeStore(); store.failNext = true;
  await assert.rejects(() => persistVerifiedPurchase(input, store), /rolled back/);
  assert.equal(store.purchases.size, 0);
  assert.equal((await persistVerifiedPurchase(input, store)).orderId, "order-1");
});
test("exact variant and complete pricing snapshots are retained", async () => {
  const store = new FakeStore(); await persistVerifiedPurchase(input, store);
  const snapshot = store.snapshots[0][0];
  assert.equal(snapshot.internalVariantId, "22222222-2222-4222-8222-222222222222");
  assert.equal(snapshot.sourceVariantId, "nike-source-variant-9");
  assert.equal(snapshot.sourceUnitPriceMinor, 7_102);
  assert.equal(snapshot.acquisitionUnitMinor, 11_363_200);
  assert.equal(snapshot.serviceMarginUnitMinor, 1_136_320);
  assert.equal(snapshot.sellingUnitMinor, 12_499_520);
  assert.deepEqual(snapshot.exchangeRateSnapshot, rateSnapshot);
});
test("amount consistency rejects a Paystack total without the single deposit", async () => {
  const store = new FakeStore();
  await assert.rejects(
    () => persistVerifiedPurchase({ ...input, firstPaymentTotalMinor: input.sellingSubtotalMinor }, store),
    /does not match/,
  );
  assert.equal(store.createCalls, 0);
});
