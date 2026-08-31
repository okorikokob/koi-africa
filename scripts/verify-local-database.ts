import { loadEnvConfig } from "@next/env";
import postgres from "postgres";

loadEnvConfig(process.cwd());

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");

  const sql = postgres(connectionString, { max: 1 });
  try {
    const tables = await sql<{ tablename: string }[]>`
      select tablename
      from pg_tables
      where schemaname = 'public' and tablename != '__koi_migrations'
      order by tablename
    `;
    const enums = await sql<{ typname: string }[]>`
      select typname
      from pg_type
      join pg_namespace on pg_namespace.oid = pg_type.typnamespace
      where nspname = 'public' and typtype = 'e'
      order by typname
    `;
    const migrations = await sql<{ count: number }[]>`
      select count(*)::integer as count from public.__koi_migrations
    `;

    if (tables.length !== 20) throw new Error(`Expected 20 domain tables, found ${tables.length}.`);
    if (enums.length !== 7) throw new Error(`Expected 7 enums, found ${enums.length}.`);
    if (migrations[0]?.count !== 3) throw new Error("Expected exactly three applied migrations.");

    console.log(`Verified ${tables.length} domain tables, ${enums.length} enums, and ${migrations[0].count} migrations.`);
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error("[verify-local-database]", error instanceof Error ? error.message : "Database verification failed.");
  process.exitCode = 1;
});
