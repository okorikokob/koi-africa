export type NikeRefreshCompletion = {
  eventType: "ACTOR.RUN.SUCCEEDED" | "ACTOR.RUN.FAILED" | "ACTOR.RUN.TIMED_OUT" | "ACTOR.RUN.ABORTED";
  resource: { id: string; actId: string; defaultDatasetId: string; status: string };
};

export interface NikeRefreshCompletionStore {
  markFailedByRun(providerRunId: string, error: string): Promise<void>;
  markSucceeded(providerRunId: string): Promise<void>;
}

export async function completeNikeProductRefresh(
  completion: NikeRefreshCompletion,
  dependencies: {
    store: NikeRefreshCompletionStore;
    ingest: (datasetId: string, source: { actorId: string; runId: string }) => Promise<{
      productsUpserted: number;
      errors: number;
      [key: string]: unknown;
    }>;
  },
): Promise<{ ingested: boolean; result?: Awaited<ReturnType<typeof dependencies.ingest>> }> {
  const { eventType, resource } = completion;
  if (eventType !== "ACTOR.RUN.SUCCEEDED") {
    await dependencies.store.markFailedByRun(resource.id, `Apify product refresh ended with ${resource.status}.`);
    return { ingested: false };
  }

  try {
    const result = await dependencies.ingest(resource.defaultDatasetId, {
      actorId: resource.actId,
      runId: resource.id,
    });
    if (result.errors > 0 || result.productsUpserted !== 1) {
      throw new Error(`Product refresh ingestion wrote ${result.productsUpserted} products with ${result.errors} errors.`);
    }
    await dependencies.store.markSucceeded(resource.id);
    return { ingested: true, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nike product refresh ingestion failed.";
    await dependencies.store.markFailedByRun(resource.id, message);
    throw error;
  }
}
