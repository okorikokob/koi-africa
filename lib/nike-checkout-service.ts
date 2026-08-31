import { db } from "@/database/client";
import { NikeCheckoutRepository } from "@/database/repositories/nikeCheckoutRepository";
import { NikePriorityRefreshRepository } from "@/database/repositories/nikePriorityRefreshRepository";
import { startNikeProductRefresh, waitForApifyRun } from "@/lib/apify-client";
import { ingestNikeDataset } from "@/lib/catalog-ingestion";
import {
  nikeCheckoutFreshnessMinutes,
  validateNikePostgresCheckout,
} from "@/lib/nike-checkout-validation";
import { NikePriorityRefreshCoordinator } from "@/lib/nike-priority-refresh";
import { completeNikeProductRefresh } from "@/lib/nike-refresh-completion";
import { confirmNikeCheckoutItems, type NikeCheckoutConfirmationInput } from "@/lib/nike-checkout-confirmation";

const checkoutRepository = new NikeCheckoutRepository(db);
const refreshRepository = new NikePriorityRefreshRepository(db);

function isLoopbackUrl(value: string): boolean {
  const hostname = new URL(value).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

async function completeLocalProductRefresh(runId: string): Promise<void> {
  try {
    const run = await waitForApifyRun(runId);
    await completeNikeProductRefresh({
      eventType: run.status === "SUCCEEDED" ? "ACTOR.RUN.SUCCEEDED"
        : run.status === "TIMED-OUT" ? "ACTOR.RUN.TIMED_OUT"
        : run.status === "ABORTED" ? "ACTOR.RUN.ABORTED"
        : "ACTOR.RUN.FAILED",
      resource: {
        id: run.runId,
        actId: run.actorId,
        defaultDatasetId: run.datasetId,
        status: run.status,
      },
    }, { store: refreshRepository, ingest: ingestNikeDataset });
  } catch (error) {
    await refreshRepository.markFailedByRun(
      runId,
      error instanceof Error ? error.message : "Local Nike product refresh completion failed.",
    );
    console.error("[nike/local-priority-refresh]", error);
  }
}

function createNikePriorityRefreshCoordinator(freshnessMinutes: number) {
  const actorId = process.env.APIFY_NIKE_ACTOR_ID;
  const callbackSecret = process.env.CATALOG_INGESTION_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  return new NikePriorityRefreshCoordinator(
    refreshRepository,
    {
      async start({ sourceProductId, canonicalUrl }) {
        if (!actorId || !siteUrl) {
          throw new Error("Nike priority refresh is not configured.");
        }
        const local = isLoopbackUrl(siteUrl);
        if (!local && !callbackSecret) {
          throw new Error("Nike priority refresh callback is not configured.");
        }
        const run = await startNikeProductRefresh({
          actorId,
          sourceProductId,
          canonicalUrl,
          ...(local ? {} : {
            callbackSecret,
            callbackUrl: `${siteUrl.replace(/\/$/, "")}/api/catalog/refresh/nike/callback`,
          }),
        });
        if (local) setTimeout(() => void completeLocalProductRefresh(run.runId), 0);
        return run;
      },
    },
    freshnessMinutes,
  );
}

export async function requestNikePriorityRefresh(input: {
  productId: string;
  sourceProductId: string;
  canonicalUrl: string;
}): Promise<{ triggered: boolean }> {
  return createNikePriorityRefreshCoordinator(nikeCheckoutFreshnessMinutes()).request(input);
}

export async function preflightNikePostgresPayment(
  productId: string,
  sourceVariantId: string,
  scheduleBackgroundRefresh?: (task: () => Promise<void>) => void,
) {
  const freshnessMinutes = nikeCheckoutFreshnessMinutes();

  return validateNikePostgresCheckout(
    { productId, sourceVariantId },
    {
      repository: checkoutRepository,
      refreshRequester: { request: requestNikePriorityRefresh },
      freshnessMinutes,
      onRefreshError: (error) => console.error("[nike/priority-refresh]", error),
      scheduleBackgroundRefresh,
    },
  );
}

export async function confirmConfiguredNikeCheckout(items: NikeCheckoutConfirmationInput[]) {
  const freshnessMinutes = nikeCheckoutFreshnessMinutes();
  return confirmNikeCheckoutItems(items, {
    validate: (productId, sourceVariantId) => validateNikePostgresCheckout(
      { productId, sourceVariantId },
      {
        repository: checkoutRepository,
        refreshRequester: { request: requestNikePriorityRefresh },
        freshnessMinutes,
        onRefreshError: (error) => console.error("[nike/checkout-confirmation]", error),
      },
    ),
    findRefreshStates: (productIds) => refreshRepository.findStates(productIds),
  });
}
