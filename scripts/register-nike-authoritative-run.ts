import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/database/schema";
import { NikeCatalogReconciliationRepository } from "@/database/repositories/nikeCatalogReconciliationRepository";
import { getApifyDatasetItems } from "@/lib/apify-client";
import { apifyNikeProductRecordSchema } from "@/lib/catalog-ingestion-schema";

loadEnvConfig(process.cwd());

function requiredEnvironmentVariable(
  name: "APIFY_NIKE_RUN_ID" | "APIFY_NIKE_DATASET_ID" | "DATABASE_URL",
): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function main(): Promise<void> {
  const sourceRunId = requiredEnvironmentVariable("APIFY_NIKE_RUN_ID");
  const datasetId = requiredEnvironmentVariable("APIFY_NIKE_DATASET_ID");
  const providerRunId = process.env.NIKE_RECONCILIATION_PROVIDER_RUN_ID
    ?? `${sourceRunId}:shadow:verified-colourways-v5`;
  const rawRecords = await getApifyDatasetItems(datasetId);
  const identities = new Map<string, {
    sourceProductId: string;
    canonicalUrl: string;
    styleCode: string | null;
  }>();
  for (const [index, rawRecord] of rawRecords.entries()) {
    const parsed = apifyNikeProductRecordSchema.safeParse(rawRecord);
    if (!parsed.success) {
      throw new Error(`Dataset record ${index} failed Nike validation: ${parsed.error.issues[0]?.message ?? "unknown error"}`);
    }
    const identity = `${parsed.data.canonicalUrl}\u0000${parsed.data.styleCode ?? ""}`;
    if (!identities.has(identity)) {
      identities.set(identity, {
        sourceProductId: parsed.data.sourceProductId,
        canonicalUrl: parsed.data.canonicalUrl,
        styleCode: parsed.data.styleCode ?? null,
      });
    }
  }

  const client = postgres(requiredEnvironmentVariable("DATABASE_URL"), { max: 1, prepare: false });
  try {
    const repository = new NikeCatalogReconciliationRepository(drizzle(client, { schema }));
    const registration = await repository.registerAuthoritativeRunPresence(
      providerRunId,
      datasetId,
      [...identities.values()],
    );
    console.log(JSON.stringify({
      sourceRecords: rawRecords.length,
      canonicalProducts: identities.size,
      ...registration,
      productStateChanged: false,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[register-nike-authoritative-run]", error);
  process.exitCode = 1;
});
