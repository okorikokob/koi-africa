import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/database/schema";
import { NikeCatalogReconciliationRepository } from "@/database/repositories/nikeCatalogReconciliationRepository";
import { previewNikeReconciliation } from "@/lib/nike-catalog-reconciliation";

loadEnvConfig(process.cwd());

function requiredEnvironmentVariable(name: "APIFY_NIKE_RUN_ID" | "DATABASE_URL"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function main(): Promise<void> {
  const sourceRunId = requiredEnvironmentVariable("APIFY_NIKE_RUN_ID");
  const providerRunId = process.env.NIKE_RECONCILIATION_PROVIDER_RUN_ID
    ?? `${sourceRunId}:shadow:verified-colourways-v5`;
  const client = postgres(requiredEnvironmentVariable("DATABASE_URL"), { max: 1, prepare: false });
  try {
    const repository = new NikeCatalogReconciliationRepository(drizzle(client, { schema }));
    const preview = await previewNikeReconciliation(providerRunId, repository);
    console.log(JSON.stringify(preview, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[preview-nike-reconciliation]", error);
  process.exitCode = 1;
});
