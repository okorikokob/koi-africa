import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { hashAdminPassword, verifyAdminPassword } from "@/lib/admin-password";

const read = (path: string) => readFileSync(path, "utf8");

test("admin passwords are salted and fail closed", async () => {
  const first = await hashAdminPassword("correct-horse-battery-staple");
  const second = await hashAdminPassword("correct-horse-battery-staple");
  assert.notEqual(first, second);
  assert.equal(await verifyAdminPassword("correct-horse-battery-staple", first), true);
  assert.equal(await verifyAdminPassword("wrong-password", first), false);
  assert.equal(await verifyAdminPassword("anything", "malformed"), false);
  await assert.rejects(() => hashAdminPassword("too-short"));
});

test("the complete admin runtime no longer imports InsForge", () => {
  const files = [
    "actions/auth.ts",
    "actions/orders.ts",
    "proxy.ts",
    "app/admin/(dashboard)/layout.tsx",
    "app/admin/(dashboard)/page.tsx",
    "app/admin/(dashboard)/orders/page.tsx",
    "app/admin/(dashboard)/orders/[id]/page.tsx",
  ];
  for (const file of files) assert.doesNotMatch(read(file), /insforge/i, file);
});

test("admin order detail uses PostgreSQL pricing and exact variant snapshots", () => {
  const repository = read("database/repositories/adminOrderRepository.ts");
  const detail = read("app/admin/(dashboard)/orders/[id]/page.tsx");
  for (const field of [
    "sourceVariantId",
    "acquisitionSubtotalMinor",
    "marginMinor",
    "logisticsDepositMinor",
    "customsTotalMinor",
    "reconciliationStatus",
  ]) {
    assert.match(repository, new RegExp(field));
    assert.match(detail, new RegExp(field));
  }
});

test("admin mutations retain audit and status history", () => {
  const repository = read("database/repositories/adminOrderRepository.ts");
  assert.match(repository, /transaction/);
  assert.match(repository, /orderStatusHistory/);
  assert.match(repository, /adminAuditLog/);
  assert.match(repository, /changedByAdminId/);
});
