import "server-only";

import { multiCurrencyDisplayEnabled } from "@/lib/catalog-feature-flags";
import type { DisplayCurrencyConfiguration } from "@/lib/display-currency";

export async function loadDisplayCurrencyConfiguration(): Promise<DisplayCurrencyConfiguration> {
  if (!multiCurrencyDisplayEnabled()) return { featureEnabled: false, snapshot: null };

  try {
    const [{ db }, { ExchangeRateRepository }] = await Promise.all([
      import("@/database/client"),
      import("@/database/repositories/exchangeRateRepository"),
    ]);
    const snapshot = await new ExchangeRateRepository(db).latestDisplayRateSnapshot();
    return { featureEnabled: true, snapshot };
  } catch (error) {
    console.error("[display-currency] Failed to load stored exchange rates.", error);
    return { featureEnabled: true, snapshot: null };
  }
}
