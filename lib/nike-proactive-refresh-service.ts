import { db } from "@/database/client";
import { NikeProactiveRefreshRepository } from "@/database/repositories/nikeProactiveRefreshRepository";
import { requestNikePriorityRefresh } from "@/lib/nike-checkout-service";
import { nikeProactiveRefreshSettings, runNikeProactiveRefreshSweep } from "@/lib/nike-proactive-refresh";

const repository = new NikeProactiveRefreshRepository(db);

export async function runConfiguredNikeProactiveRefreshSweep() {
  const settings = nikeProactiveRefreshSettings();
  return runNikeProactiveRefreshSweep({
    repository,
    refreshRequester: { request: requestNikePriorityRefresh },
    ageMinutes: settings.ageMinutes,
    batchSize: settings.batchSize,
  });
}
