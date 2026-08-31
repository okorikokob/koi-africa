import { eq, inArray, lte } from "drizzle-orm";
import type { db } from "@/database/client";
import { catalogPriorityRefreshes } from "@/database/schema";

type Database = typeof db;

export class NikePriorityRefreshRepository {
  constructor(private readonly database: Database) {}

  async claim(productId: string, requestedAt: Date, deduplicateUntil: Date): Promise<boolean> {
    const [claimed] = await this.database.insert(catalogPriorityRefreshes).values({
      productId,
      provider: "apify",
      status: "starting",
      requestedAt,
      deduplicateUntil,
      providerRunId: null,
      completedAt: null,
      errorMessage: null,
    }).onConflictDoUpdate({
      target: catalogPriorityRefreshes.productId,
      set: {
        status: "starting",
        requestedAt,
        deduplicateUntil,
        providerRunId: null,
        completedAt: null,
        errorMessage: null,
        updatedAt: requestedAt,
      },
      setWhere: lte(catalogPriorityRefreshes.deduplicateUntil, requestedAt),
    }).returning({ productId: catalogPriorityRefreshes.productId });
    return Boolean(claimed);
  }

  async findStates(productIds: string[]): Promise<Array<{
    productId: string;
    status: "starting" | "running" | "succeeded" | "failed";
    errorMessage: string | null;
  }>> {
    if (productIds.length === 0) return [];
    return this.database.select({
      productId: catalogPriorityRefreshes.productId,
      status: catalogPriorityRefreshes.status,
      errorMessage: catalogPriorityRefreshes.errorMessage,
    }).from(catalogPriorityRefreshes)
      .where(inArray(catalogPriorityRefreshes.productId, productIds));
  }

  async markRunning(productId: string, providerRunId: string): Promise<void> {
    await this.database.update(catalogPriorityRefreshes).set({
      providerRunId,
      status: "running",
      updatedAt: new Date(),
    }).where(eq(catalogPriorityRefreshes.productId, productId));
  }

  async markFailedByProduct(productId: string, error: string): Promise<void> {
    await this.database.update(catalogPriorityRefreshes).set({
      status: "failed",
      completedAt: new Date(),
      errorMessage: error.slice(0, 4000),
      updatedAt: new Date(),
    }).where(eq(catalogPriorityRefreshes.productId, productId));
  }

  async markFailedByRun(providerRunId: string, error: string): Promise<void> {
    await this.database.update(catalogPriorityRefreshes).set({
      status: "failed",
      completedAt: new Date(),
      errorMessage: error.slice(0, 4000),
      updatedAt: new Date(),
    }).where(eq(catalogPriorityRefreshes.providerRunId, providerRunId));
  }

  async markSucceeded(providerRunId: string): Promise<void> {
    const completedAt = new Date();
    await this.database.update(catalogPriorityRefreshes).set({
      status: "succeeded",
      deduplicateUntil: completedAt,
      completedAt,
      errorMessage: null,
      updatedAt: completedAt,
    }).where(eq(catalogPriorityRefreshes.providerRunId, providerRunId));
  }
}
