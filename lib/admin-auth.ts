import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/database/client";
import { adminAuditLog, adminSessions, adminUsers } from "@/database/schema";
import { hashAdminPassword, verifyAdminPassword } from "@/lib/admin-password";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth-constants";

export { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth-constants";
const STANDARD_SESSION_MS = 12 * 60 * 60 * 1000;
const REMEMBERED_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type AdminIdentity = {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "operator" | "viewer";
};

export type AdminPasswordRotationResult = "success" | "unauthenticated" | "invalid_current_password";

export async function signInAdmin(email: string, password: string, remember: boolean): Promise<AdminIdentity | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const [user] = await db.select({
    id: adminUsers.id,
    email: adminUsers.email,
    name: adminUsers.name,
    role: adminUsers.role,
    passwordHash: adminUsers.passwordHash,
    isActive: adminUsers.isActive,
  }).from(adminUsers).where(eq(adminUsers.email, normalizedEmail)).limit(1);
  if (!user?.isActive || !user.passwordHash || !(await verifyAdminPassword(password, user.passwordHash))) return null;

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + (remember ? REMEMBERED_SESSION_MS : STANDARD_SESSION_MS));
  await db.transaction(async (transaction) => {
    await transaction.insert(adminSessions).values({ adminUserId: user.id, tokenHash: tokenHash(token), expiresAt });
    await transaction.update(adminUsers).set({ lastSignedInAt: new Date(), updatedAt: new Date() })
      .where(eq(adminUsers.id, user.id));
  });
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { expires: expiresAt } : {}),
  });
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function getAdminUser(): Promise<AdminIdentity | null> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db.select({
    id: adminUsers.id,
    email: adminUsers.email,
    name: adminUsers.name,
    role: adminUsers.role,
  }).from(adminSessions)
    .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.adminUserId))
    .where(and(
      eq(adminSessions.tokenHash, tokenHash(token)),
      gt(adminSessions.expiresAt, new Date()),
      eq(adminUsers.isActive, true),
    ))
    .limit(1);
  return row ?? null;
}

export async function signOutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) await db.delete(adminSessions).where(eq(adminSessions.tokenHash, tokenHash(token)));
  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function rotateAdminPassword(
  currentPassword: string,
  newPassword: string,
): Promise<AdminPasswordRotationResult> {
  const cookieStore = await cookies();
  const currentToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!currentToken) return "unauthenticated";

  const [user] = await db.select({
    id: adminUsers.id,
    passwordHash: adminUsers.passwordHash,
  }).from(adminSessions)
    .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.adminUserId))
    .where(and(
      eq(adminSessions.tokenHash, tokenHash(currentToken)),
      gt(adminSessions.expiresAt, new Date()),
      eq(adminUsers.isActive, true),
    ))
    .limit(1);
  if (!user?.passwordHash) return "unauthenticated";
  const currentPasswordHash = user.passwordHash;
  if (!(await verifyAdminPassword(currentPassword, currentPasswordHash))) {
    return "invalid_current_password";
  }

  const nextPasswordHash = await hashAdminPassword(newPassword);
  const nextToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + STANDARD_SESSION_MS);
  const rotated = await db.transaction(async (transaction) => {
    const [updated] = await transaction.update(adminUsers).set({
      passwordHash: nextPasswordHash,
      updatedAt: new Date(),
    }).where(and(
      eq(adminUsers.id, user.id),
      eq(adminUsers.passwordHash, currentPasswordHash),
    )).returning({ id: adminUsers.id });
    if (!updated) return false;

    await transaction.delete(adminSessions).where(eq(adminSessions.adminUserId, user.id));
    await transaction.insert(adminSessions).values({
      adminUserId: user.id,
      tokenHash: tokenHash(nextToken),
      expiresAt,
    });
    await transaction.insert(adminAuditLog).values({
      adminUserId: user.id,
      action: "admin.password_changed",
      entityType: "admin_user",
      entityId: user.id,
      changes: JSON.stringify({ allPreviousSessionsRevoked: true }),
    });
    return true;
  });

  if (!rotated) return "invalid_current_password";
  cookieStore.set(ADMIN_SESSION_COOKIE, nextToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return "success";
}
