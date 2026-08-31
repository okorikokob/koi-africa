import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/database/schema";

loadEnvConfig(process.cwd());

async function main(): Promise<void> {
  const [{ dhlLogisticsFoundationEnabled }, { DhlLogisticsReadinessRepository }] = await Promise.all([
    import("@/lib/catalog-feature-flags"),
    import("@/database/repositories/dhlLogisticsReadinessRepository"),
  ]);
  if (!dhlLogisticsFoundationEnabled()) {
    throw new Error("KOI_DHL_LOGISTICS_FOUNDATION must be true to run the local readiness report.");
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");
  const client = postgres(connectionString, { max: 1, prepare: false });
  const db = drizzle(client, { schema });
  try {
    const readiness = await new DhlLogisticsReadinessRepository(db).inspectNike();
    const blockingInputs: string[] = [];
    if (readiness.estimatedQuoteReadyProducts === 0) {
      blockingInputs.push("verified Nike catalogue weights and complete dimensions for estimates");
    }
    if (readiness.activeShippingZones === 0) {
      blockingInputs.push("configured DHL origin and Nigeria destination zones");
    }
    if (readiness.activeDhlRateCards === 0) {
      blockingInputs.push("an official, effective DHL business rate card");
    }
    console.log(JSON.stringify({
      status: blockingInputs.length === 0 ? "ready_for_estimated_quotes" : "not_quotable",
      readiness,
      blockingInputs,
      safeguards: [
        "No weight or dimensions are inferred.",
        "No DHL rate is hardcoded.",
        "No KOI logistics margin is hardcoded.",
        "Confirmed charges require physical package pieces and an official DHL quote.",
        "Customs remains separate from delivery.",
      ],
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[report-dhl-logistics-readiness]", error);
  process.exitCode = 1;
});
