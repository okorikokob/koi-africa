import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  isLogisticsReconciliationSettled,
  parseNairaAmountToMinor,
  reconcileLogisticsDeposit,
  settlementStatusFor,
  validateMeasuredPackages,
} from "@/lib/admin-logistics";
import { availableOrderStatuses, canTransitionOrderStatus } from "@/lib/shipping";

test("parses admin-entered naira amounts into exact integer minor units", () => {
  assert.equal(parseNairaAmountToMinor("30,000"), 3_000_000);
  assert.equal(parseNairaAmountToMinor("30000.50"), 3_000_050);
  assert.equal(parseNairaAmountToMinor("0"), 0);
  assert.equal(parseNairaAmountToMinor("30000.001"), null);
  assert.equal(parseNairaAmountToMinor("-1"), null);
  assert.equal(parseNairaAmountToMinor("not money"), null);
});

test("requires complete positive physical package measurements", () => {
  assert.equal(validateMeasuredPackages([{ actualWeightGrams: 950, lengthMm: 320, widthMm: 220, heightMm: 140 }]), null);
  assert.match(validateMeasuredPackages([{ actualWeightGrams: 0, lengthMm: 320, widthMm: 220, heightMm: 140 }]) ?? "", /positive/);
  assert.match(validateMeasuredPackages([]) ?? "", /at least one/);
  assert.match(validateMeasuredPackages(Array.from({ length: 11 }, () => ({ actualWeightGrams: 1, lengthMm: 1, widthMm: 1, heightMm: 1 }))) ?? "", /more than 10/);
});

test("order status progression is forward-only and shipping waits for settlement", () => {
  assert.equal(canTransitionOrderStatus("paid", "sourcing", false), true);
  assert.equal(canTransitionOrderStatus("sourcing", "paid", false), false);
  assert.equal(canTransitionOrderStatus("sourcing", "shipped", false), false);
  assert.equal(canTransitionOrderStatus("sourcing", "shipped", true), true);
  assert.equal(canTransitionOrderStatus("shipped", "cancelled", true), false);
  assert.deepEqual(availableOrderStatuses("delivered", true), ["delivered"]);
});

test("only completed reconciliation states unlock shipment", () => {
  assert.equal(isLogisticsReconciliationSettled("pending_measurement"), false);
  assert.equal(isLogisticsReconciliationSettled("refund_due"), false);
  assert.equal(isLogisticsReconciliationSettled("top_up_due"), false);
  assert.equal(isLogisticsReconciliationSettled("no_adjustment"), true);
  assert.equal(isLogisticsReconciliationSettled("refunded"), true);
  assert.equal(isLogisticsReconciliationSettled("top_up_paid"), true);
  assert.equal(settlementStatusFor("refund_due"), "refunded");
  assert.equal(settlementStatusFor("top_up_due"), "top_up_paid");
  assert.equal(settlementStatusFor("no_adjustment"), null);
});

test("reconciles a deposit generically without including Customs", () => {
  assert.deepEqual(reconcileLogisticsDeposit(2_500_000, 3_000_000), {
    actualLogisticsMinor: 2_500_000,
    adjustmentMinor: -500_000,
    status: "refund_due",
  });
  assert.equal(reconcileLogisticsDeposit(3_000_000, 3_000_000).status, "no_adjustment");
  assert.equal(reconcileLogisticsDeposit(3_500_000, 3_000_000).status, "top_up_due");
});

test("admin logistics writes are transactional and audited without changing Customs", () => {
  const repository = readFileSync("database/repositories/adminOrderRepository.ts", "utf8");
  for (const action of ["order.logistics_measured", "order.logistics_reconciled", "order.logistics_refund_recorded", "order.logistics_top_up_recorded"]) {
    assert.match(repository, new RegExp(action.replaceAll(".", "\\.")));
  }
  assert.match(repository, /transaction\.delete\(shipmentPackages\)/);
  assert.match(repository, /customsIncluded: false/);
  assert.doesNotMatch(repository, /customsTotalMinor:\s*reconciliation/);
});
