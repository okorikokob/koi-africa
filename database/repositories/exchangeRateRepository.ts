import { and, desc, eq, inArray } from "drizzle-orm";
import type { db } from "@/database/client";
import { exchangeRates } from "@/database/schema";
import type {
  DisplayRateSnapshot,
  StoredDisplayRate,
  SupportedDisplayCurrency,
} from "@/lib/display-currency";
import { normalizeDisplayCurrency } from "@/lib/display-currency";

type Database = typeof db;

const REQUIRED_QUOTES = ["NGN", "GBP", "EUR"] as const;

export class ExchangeRateRepository {
  constructor(private readonly database: Database) {}

  async latestDisplayRateSnapshot(): Promise<DisplayRateSnapshot | null> {
    const rows = await this.database.select().from(exchangeRates).where(and(
      eq(exchangeRates.baseCurrency, "USD"),
      inArray(exchangeRates.quoteCurrency, [...REQUIRED_QUOTES]),
    )).orderBy(desc(exchangeRates.effectiveAt), desc(exchangeRates.createdAt));

    const latest = new Map<SupportedDisplayCurrency, StoredDisplayRate>();
    for (const row of rows) {
      const quote = normalizeDisplayCurrency(row.quoteCurrency);
      if (!quote || quote === "USD") continue;
      if (latest.has(quote)) continue;
      latest.set(quote, {
        rate: row.rate,
        source: row.source,
        sourceReference: row.sourceReference,
        effectiveAt: row.effectiveAt.toISOString(),
      });
    }
    const ngn = latest.get("NGN");
    const gbp = latest.get("GBP");
    const eur = latest.get("EUR");
    if (!ngn || !gbp || !eur) return null;

    const newestEffectiveAt = [...latest.values()]
      .map((rate) => rate.effectiveAt)
      .sort((left, right) => right.localeCompare(left))[0] ?? new Date(0).toISOString();
    return {
      anchorCurrency: "USD",
      rates: {
        USD: {
          rate: "1.000000000000",
          source: "identity",
          sourceReference: null,
          effectiveAt: newestEffectiveAt,
        },
        NGN: ngn,
        GBP: gbp,
        EUR: eur,
      },
    };
  }
}
