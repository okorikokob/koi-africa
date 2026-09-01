import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { adminUsers } from "@/database/schema";
import { hashAdminPassword } from "@/lib/admin-password";

loadEnvConfig(process.cwd());

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const email = process.env.KOI_ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.KOI_ADMIN_BOOTSTRAP_PASSWORD;
  if (!connectionString || !email || !password) throw new Error("Admin bootstrap environment is incomplete.");
  const client = postgres(connectionString, { max: 1, prepare: false });
  try {
    const database = drizzle(client);
    const passwordHash = await hashAdminPassword(password);
    const [user] = await database.insert(adminUsers).values({
      authProvider: "local",
      authSubject: email,
      email,
      name: "Okorikoko",
      role: "admin",
      passwordHash,
      isActive: true,
    }).onConflictDoUpdate({
      target: adminUsers.email,
      set: { authProvider: "local", authSubject: email, passwordHash, role: "admin", isActive: true, updatedAt: new Date() },
    }).returning({ id: adminUsers.id, email: adminUsers.email, role: adminUsers.role });
    console.log(JSON.stringify({ ...user, passwordConfigured: true }));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[bootstrap-postgres-admin]", error instanceof Error ? error.message : "Bootstrap failed.");
  process.exitCode = 1;
});
