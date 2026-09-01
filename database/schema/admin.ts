import { boolean, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "@/database/schema/common";

export const adminRole = pgEnum("admin_role", ["admin", "operator", "viewer"]);

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  authProvider: text("auth_provider").notNull(),
  authSubject: text("auth_subject").notNull(),
  email: text("email").notNull(),
  name: text("name"),
  passwordHash: text("password_hash"),
  role: adminRole("role").notNull().default("operator"),
  isActive: boolean("is_active").notNull().default(true),
  lastSignedInAt: timestamp("last_signed_in_at", { withTimezone: true }),
  ...timestamps(),
}, (table) => [
  uniqueIndex("admin_users_provider_subject_uidx").on(table.authProvider, table.authSubject),
  uniqueIndex("admin_users_email_uidx").on(table.email),
]);

export const adminSessions = pgTable("admin_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminUserId: uuid("admin_user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("admin_sessions_token_hash_uidx").on(table.tokenHash),
  index("admin_sessions_user_expires_idx").on(table.adminUserId, table.expiresAt),
]);

export const adminAuditLog = pgTable("admin_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminUserId: uuid("admin_user_id").references(() => adminUsers.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  changes: text("changes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
