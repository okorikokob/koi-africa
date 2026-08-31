export interface NikePriorityRefreshStore {
  claim(productId: string, requestedAt: Date, deduplicateUntil: Date): Promise<boolean>;
  markRunning(productId: string, providerRunId: string): Promise<void>;
  markFailedByProduct(productId: string, error: string): Promise<void>;
}

export interface NikeProductRefreshRunner {
  start(input: { sourceProductId: string; canonicalUrl: string }): Promise<{ runId: string }>;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class NikePriorityRefreshCoordinator {
  constructor(
    private readonly store: NikePriorityRefreshStore,
    private readonly runner: NikeProductRefreshRunner,
    private readonly freshnessMinutes: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async request(input: { productId: string; sourceProductId: string; canonicalUrl: string }): Promise<{ triggered: boolean }> {
    const requestedAt = this.now();
    const deduplicateUntil = new Date(requestedAt.getTime() + this.freshnessMinutes * 60_000);
    const claimed = await this.store.claim(input.productId, requestedAt, deduplicateUntil);
    if (!claimed) return { triggered: false };

    try {
      const run = await this.runner.start({ sourceProductId: input.sourceProductId, canonicalUrl: input.canonicalUrl });
      await this.store.markRunning(input.productId, run.runId);
      return { triggered: true };
    } catch (error) {
      await this.store.markFailedByProduct(input.productId, message(error));
      throw error;
    }
  }
}
