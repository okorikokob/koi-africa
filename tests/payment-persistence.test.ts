import assert from "node:assert/strict";
import test from "node:test";
import { persistVerifiedPurchase, type PaidItemInput, type PersistedPurchase, type ResolvedItem, type VerifiedPurchaseInput, type VerifiedPurchaseStore } from "@/lib/payment-persistence";

const item: PaidItemInput = { productId: "11111111-1111-4111-8111-111111111111", variantId: "nike-source-variant-9", sku: "SKU-9", gtin: "GTIN-9", selectedOptions: [{ name: "Size", value: "9" }], title: "Nike Test", vendorName: "Nike", vendorUrl: "https://nike.com/test", priceNaira: 125_000, qty: 1 };
const input: VerifiedPurchaseInput = { providerReference: "KOI-TEST01", orderReference: "KOI-ORDER1", customerName: "Test Customer", customerEmail: "test@example.com", customerPhone: "08000000000", deliveryAddress: "1 Test Street", deliveryCity: "Abuja", deliveryRegion: "FCT", deliveryLandmark: null, subtotalNaira: 125_000, totalNaira: 125_000, channel: "card", items: [item] };
const resolved: ResolvedItem = { ...item, internalProductId: item.productId, internalVariantId: "22222222-2222-4222-8222-222222222222", sourceProductId: "nike-source-product-1", sourceVariantId: "nike-source-variant-9", brandName: "Nike", imageUrl: "https://static.nike.com/test.jpg" };

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
    if (this.purchases.has(value.providerReference)) { const conflict = new Error("duplicate") as Error & { code: string }; conflict.code = "23505"; throw conflict; }
    const purchase = { orderId: "order-1", orderReference: value.orderReference, totalMinor: Math.round(value.totalNaira * 100), items: items.map((candidate) => ({ title: candidate.title, qty: candidate.qty, image: candidate.imageUrl })) };
    this.snapshots.push(items); this.purchases.set(value.providerReference, purchase); return purchase;
  }
  isProviderReferenceConflict(error: unknown) { return typeof error === "object" && error !== null && "code" in error && error.code === "23505"; }
}

test("successful verification persists one atomic purchase in minor units", async () => { const store = new FakeStore(); const purchase = await persistVerifiedPurchase(input, store); assert.equal(purchase.totalMinor, 12_500_000); assert.equal(store.createCalls, 1); });
test("duplicate verification reuses the existing order and payment", async () => { const store = new FakeStore(); const first = await persistVerifiedPurchase(input, store); const second = await persistVerifiedPurchase({ ...input, orderReference: "KOI-ORDER2" }, store); assert.deepEqual(second, first); assert.equal(store.createCalls, 1); });
test("concurrent verification resolves the provider-reference conflict to one purchase", async () => { const store = new FakeStore(); const [first, second] = await Promise.all([persistVerifiedPurchase(input, store), persistVerifiedPurchase({ ...input, orderReference: "KOI-ORDER2" }, store)]); assert.equal(first.orderId, second.orderId); assert.equal(store.purchases.size, 1); });
test("transaction failure remains recoverable on retry", async () => { const store = new FakeStore(); store.failNext = true; await assert.rejects(() => persistVerifiedPurchase(input, store), /rolled back/); assert.equal(store.purchases.size, 0); const recovered = await persistVerifiedPurchase(input, store); assert.equal(recovered.orderId, "order-1"); });
test("exact internal and source variant identities are retained in the snapshot", async () => { const store = new FakeStore(); await persistVerifiedPurchase(input, store); assert.equal(store.snapshots[0][0].internalVariantId, "22222222-2222-4222-8222-222222222222"); assert.equal(store.snapshots[0][0].sourceVariantId, "nike-source-variant-9"); });
test("amount consistency rejects mismatched totals", async () => { const store = new FakeStore(); await assert.rejects(() => persistVerifiedPurchase({ ...input, totalNaira: 125_001 }, store), /does not match/); assert.equal(store.createCalls, 0); });
