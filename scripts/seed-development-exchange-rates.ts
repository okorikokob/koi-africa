import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { exchangeRates } from "@/database/schema";

loadEnvConfig(process.cwd());

type RateVariable = "KOI_DEV_USD_NGN_RATE" | "KOI_DEV_USD_GBP_RATE" | "KOI_DEV_USD_EUR_RATE";

function requiredEnvironmentVariable(name: RateVariable | "DATABASE_URL"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function requiredPositiveDecimal(name: RateVariable): string {
  const value = requiredEnvironmentVariable(name);
  if (!/^\d+(?:\.\d+)?$/.test(value) || Number(value) <= 0) {
    throw new Error(`${name} must be a positive decimal.`);
  }
  return value;
}

async function main(): Promise<void> {
  const effectiveAt = new Date();
  const source = "manual-development";
  const sourceReference = "local-display-pricing-test";
  const client = postgres(requiredEnvironmentVariable("DATABASE_URL"), { max: 1, prepare: false });
  try {
    const database = drizzle(client);
    const inserted = await database.insert(exchangeRates).values([
      {
        baseCurrency: "USD",
        quoteCurrency: "NGN",
        rate: requiredPositiveDecimal("KOI_DEV_USD_NGN_RATE"),
        source,
        sourceReference,
        effectiveAt,
      },
      {
        baseCurrency: "USD",
        quoteCurrency: "GBP",
        rate: requiredPositiveDecimal("KOI_DEV_USD_GBP_RATE"),
        source,
        sourceReference,
        effectiveAt,
      },
      {
        baseCurrency: "USD",
        quoteCurrency: "EUR",
        rate: requiredPositiveDecimal("KOI_DEV_USD_EUR_RATE"),
        source,
        sourceReference,
        effectiveAt,
      },
    ]).returning({
      id: exchangeRates.id,
      baseCurrency: exchangeRates.baseCurrency,
      quoteCurrency: exchangeRates.quoteCurrency,
      rate: exchangeRates.rate,
      effectiveAt: exchangeRates.effectiveAt,
    });
    console.log(JSON.stringify({ source, sourceReference, rates: inserted }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[seed-development-exchange-rates]", error);
  process.exitCode = 1;
});
