import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  hashAdminPassword,
  validateAdminPasswordChange,
  verifyAdminPassword,
} from "@/lib/admin-password";
import { ADMIN_PASSWORD_MIN_LENGTH } from "@/lib/admin-auth-constants";

const read = (path: string) => readFileSync(path, "utf8");

test("admin passwords are salted and fail closed", async () => {
  const first = await hashAdminPassword("correct-horse-battery-staple");
  const second = await hashAdminPassword("correct-horse-battery-staple");
  assert.notEqual(first, second);
  assert.equal(await verifyAdminPassword("correct-horse-battery-staple", first), true);
  assert.equal(await verifyAdminPassword("wrong-password", first), false);
  assert.equal(await verifyAdminPassword("anything", "malformed"), false);
  assert.equal(ADMIN_PASSWORD_MIN_LENGTH, 10);
  await assert.rejects(() => hashAdminPassword("short"));
});

test("admin password change validation enforces the approved policy", () => {
  assert.equal(validateAdminPasswordChange({ currentPassword: "old-password", newPassword: "new-secure", confirmPassword: "new-secure" }), null);
  assert.match(validateAdminPasswordChange({ currentPassword: "old-password", newPassword: "short", confirmPassword: "short" }) ?? "", /at least 10/);
  assert.match(validateAdminPasswordChange({ currentPassword: "old-password", newPassword: "new-secure", confirmPassword: "different!" }) ?? "", /do not match/);
  assert.match(validateAdminPasswordChange({ currentPassword: "same-password", newPassword: "same-password", confirmPassword: "same-password" }) ?? "", /different/);
});

test("password rotation is atomic, revokes prior sessions, and audits safely", () => {
  const auth = read("lib/admin-auth.ts");
  assert.match(auth, /db\.transaction/);
  assert.match(auth, /delete\(adminSessions\)/);
  assert.match(auth, /insert\(adminSessions\)/);
  assert.match(auth, /admin\.password_changed/);
  assert.doesNotMatch(auth, /changes:.*Password/);
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
    "app/admin/(dashboard)/settings/page.tsx",
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
