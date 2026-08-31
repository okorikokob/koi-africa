import { sql } from "drizzle-orm";
import { check, index, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { currencyCode, timestamps } from "@/database/schema/common";

export const exchangeRates = pgTable("exchange_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  baseCurrency: currencyCode("base_currency").notNull(),
  quoteCurrency: currencyCode("quote_currency").notNull(),
  rate: numeric("rate", { precision: 24, scale: 12 }).notNull(),
  source: text("source").notNull(),
  sourceReference: text("source_reference"),
  effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
  ...timestamps(),
}, (table) => [
  uniqueIndex("exchange_rates_source_pair_effective_uidx").on(
    table.source,
    table.baseCurrency,
    table.quoteCurrency,
    table.effectiveAt,
  ),
  index("exchange_rates_pair_effective_idx").on(table.baseCurrency, table.quoteCurrency, table.effectiveAt),
  check("exchange_rates_positive", sql`${table.rate} > 0`),
  check("exchange_rates_distinct_currencies", sql`${table.baseCurrency} <> ${table.quoteCurrency}`),
]);
