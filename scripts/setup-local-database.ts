import { loadEnvConfig } from "@next/env";
import postgres from "postgres";

loadEnvConfig(process.cwd());

function getDatabaseUrls(): { adminUrl: string; databaseName: string } {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");

  const targetUrl = new URL(connectionString);
  const databaseName = targetUrl.pathname.slice(1);
  if (!/^[a-z][a-z0-9_]*$/.test(databaseName)) {
    throw new Error("The local database name must contain only lowercase letters, numbers, and underscores.");
  }

  const adminUrl = new URL(targetUrl);
  adminUrl.pathname = "/postgres";
  return { adminUrl: adminUrl.toString(), databaseName };
}

async function main(): Promise<void> {
  const { adminUrl, databaseName } = getDatabaseUrls();
  const sql = postgres(adminUrl, { max: 1 });

  try {
    const existing = await sql<{ exists: boolean }[]>`
      select exists(select 1 from pg_database where datname = ${databaseName}) as exists
    `;
    if (existing[0]?.exists) {
      console.log(`Database ${databaseName} already exists.`);
      return;
    }

    await sql.unsafe(`create database "${databaseName}"`);
    console.log(`Database ${databaseName} created.`);
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error("[setup-local-database]", error instanceof Error ? error.message : "Database setup failed.");
  process.exitCode = 1;
});
