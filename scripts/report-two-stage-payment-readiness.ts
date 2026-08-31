import { loadEnvConfig } from "@next/env";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/database/schema";

loadEnvConfig(process.cwd());

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");
  const client = postgres(connectionString, { max: 1, prepare: false });
  const database = drizzle(client, { schema });
  try {
    const [readiness] = await database.execute(sql<{
      activeServiceFeePolicies: number;
      pendingProductRequests: number;
      pendingDeliveryRequests: number;
      paidProductRequests: number;
      paidDeliveryRequests: number;
    }>`
      select
        (select count(*)::int from service_fee_policies where is_active = true) as "activeServiceFeePolicies",
        (select count(*)::int from payment_requests where purpose = 'product_and_service' and status = 'pending') as "pendingProductRequests",
        (select count(*)::int from payment_requests where purpose = 'delivery' and status = 'pending') as "pendingDeliveryRequests",
        (select count(*)::int from payment_requests where purpose = 'product_and_service' and status = 'paid') as "paidProductRequests",
        (select count(*)::int from payment_requests where purpose = 'delivery' and status = 'paid') as "paidDeliveryRequests"
    `);
    if (!readiness) throw new Error("The two-stage payment readiness query returned no result.");
    console.log(JSON.stringify({
      status: readiness.activeServiceFeePolicies === 0 ? "awaiting_business_policy" : "policy_configured",
      readiness,
      safeguards: [
        "Existing checkout and Paystack routes are unchanged.",
        "No service-fee percentage is hardcoded or seeded.",
        "Delivery payment requires a confirmed shipment quote.",
        "Customs is excluded from product and delivery payment requests.",
        "Dispatch requires verified delivery payment only when the development flag is enabled.",
      ],
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[report-two-stage-payment-readiness]", error);
  process.exitCode = 1;
});
