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

    const tableNames = new Set(tables.map((table) => table.tablename));
    const requiredTables = ["products", "product_variants", "orders", "order_items", "payments", "exchange_rates"];
    const missingTables = requiredTables.filter((table) => !tableNames.has(table));
    if (missingTables.length) throw new Error(`Missing required tables: ${missingTables.join(", ")}.`);
    const enumNames = new Set(enums.map((entry) => entry.typname));
    if (!enumNames.has("logistics_reconciliation_status")) {
      throw new Error("Missing logistics_reconciliation_status enum.");
    }
    if ((migrations[0]?.count ?? 0) < 10) throw new Error("Expected at least ten applied Drizzle migrations.");

    const pricingColumns = await sql<{ column_name: string }[]>`
      select column_name from information_schema.columns
      where table_schema = 'public'
        and table_name = 'order_items'
        and column_name in (
          'source_currency', 'source_unit_price_minor', 'acquisition_unit_minor',
          'service_margin_unit_minor', 'selling_unit_minor', 'exchange_rate_snapshot'
        )
    `;
    if (pricingColumns.length !== 6) throw new Error("Order item pricing snapshots are incomplete.");

    console.log(`Verified ${tables.length} domain tables, ${enums.length} enums, ${migrations[0].count} migrations, and Nike pricing snapshots.`);
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error("[verify-local-database]", error instanceof Error ? error.message : "Database verification failed.");
  process.exitCode = 1;
});
