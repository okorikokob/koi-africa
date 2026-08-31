import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/database/schema";
import { NikeCatalogReconciliationRepository } from "@/database/repositories/nikeCatalogReconciliationRepository";
import { applyApprovedNikeReconciliation } from "@/lib/nike-catalog-reconciliation";

loadEnvConfig(process.cwd());

const APPROVED_SOURCE_RUN_ID = "UNBogcWgrcqrdSAhx";
const APPROVED_SOURCE_PRODUCT_IDS = [
  "1015765474",
  "1015835584",
  "1015839975",
  "1015920383",
  "1015920815",
  "1015920823",
  "1015928562",
  "1015931050",
  "1015938251",
  "1015942251",
  "1015945668",
  "1015966307",
  "1015966459",
  "1015990780",
  "1016001744",
  "1016003187",
  "1016056250",
  "1016056514",
  "1016056635",
] as const;

function requiredEnvironmentVariable(name: "APIFY_NIKE_RUN_ID" | "DATABASE_URL"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function main(): Promise<void> {
  const sourceRunId = requiredEnvironmentVariable("APIFY_NIKE_RUN_ID");
  if (sourceRunId !== APPROVED_SOURCE_RUN_ID) {
    throw new Error("This approval is restricted to the reviewed Nike authoritative run.");
  }
  const providerRunId = process.env.NIKE_RECONCILIATION_PROVIDER_RUN_ID
    ?? `${sourceRunId}:shadow:verified-colourways-v5`;
  const client = postgres(requiredEnvironmentVariable("DATABASE_URL"), { max: 1, prepare: false });
  try {
    const repository = new NikeCatalogReconciliationRepository(drizzle(client, { schema }));
    const result = await applyApprovedNikeReconciliation(
      providerRunId,
      [...APPROVED_SOURCE_PRODUCT_IDS],
      repository,
    );
    console.log(JSON.stringify({
      approvalSourceRunId: APPROVED_SOURCE_RUN_ID,
      approvedCandidates: APPROVED_SOURCE_PRODUCT_IDS.length,
      ...result,
      recordsDeleted: 0,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[apply-approved-nike-reconciliation]", error);
  process.exitCode = 1;
});
