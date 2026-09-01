import "server-only";

import { multiCurrencyDisplayEnabled } from "@/lib/catalog-feature-flags";
import type { DisplayCurrencyConfiguration } from "@/lib/display-currency";

export async function loadLatestDisplayRateSnapshot() {
  const [{ db }, { ExchangeRateRepository }] = await Promise.all([
    import("@/database/client"),
    import("@/database/repositories/exchangeRateRepository"),
  ]);
  return new ExchangeRateRepository(db).latestDisplayRateSnapshot();
}

export async function loadDisplayCurrencyConfiguration(): Promise<DisplayCurrencyConfiguration> {
  if (!multiCurrencyDisplayEnabled()) return { featureEnabled: false, snapshot: null };

  try {
    const snapshot = await loadLatestDisplayRateSnapshot();
    return { featureEnabled: true, snapshot };
  } catch (error) {
    console.error("[display-currency] Failed to load stored exchange rates.", error);
    return { featureEnabled: true, snapshot: null };
  }
}
