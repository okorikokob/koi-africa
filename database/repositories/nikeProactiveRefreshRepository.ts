import { and, asc, eq, isNull, lte, or, sql } from "drizzle-orm";
import type { db } from "@/database/client";
import { catalogPriorityRefreshes, products, storefronts } from "@/database/schema";
import type { NikeProactiveRefreshCandidate, NikeProactiveRefreshRepository as CandidateRepository } from "@/lib/nike-proactive-refresh";

type Database = typeof db;

export class NikeProactiveRefreshRepository implements CandidateRepository {
  constructor(private readonly database: Database) {}

  async findDueProduct(input: {
    productId: string;
    staleBefore: Date;
    now: Date;
  }): Promise<NikeProactiveRefreshCandidate | null> {
    const [candidate] = await this.database.select({
      productId: products.id,
      sourceProductId: products.sourceProductId,
      canonicalUrl: products.canonicalUrl,
    }).from(products)
      .innerJoin(storefronts, eq(products.storefrontId, storefronts.id))
      .leftJoin(catalogPriorityRefreshes, eq(products.id, catalogPriorityRefreshes.productId))
      .where(and(
        eq(products.id, input.productId),
        eq(products.provider, "apify"),
        eq(storefronts.sourceStorefrontId, "nike-us"),
        eq(storefronts.isActive, true),
        eq(products.isActive, true),
        sql`coalesce(${products.sourceUpdatedAt}, ${products.lastSyncedAt}) <= ${input.staleBefore.toISOString()}::timestamptz`,
        or(
          isNull(catalogPriorityRefreshes.productId),
          lte(catalogPriorityRefreshes.deduplicateUntil, input.now),
        ),
      ))
      .limit(1);
    return candidate ?? null;
  }

  async findDue(input: { staleBefore: Date; now: Date; limit: number }): Promise<NikeProactiveRefreshCandidate[]> {
    const freshness = sql<Date>`coalesce(${products.sourceUpdatedAt}, ${products.lastSyncedAt})`;
    return this.database.select({
      productId: products.id,
      sourceProductId: products.sourceProductId,
      canonicalUrl: products.canonicalUrl,
    }).from(products)
      .innerJoin(storefronts, eq(products.storefrontId, storefronts.id))
      .leftJoin(catalogPriorityRefreshes, eq(products.id, catalogPriorityRefreshes.productId))
      .where(and(
        eq(products.provider, "apify"),
        eq(storefronts.sourceStorefrontId, "nike-us"),
        eq(storefronts.isActive, true),
        eq(products.isActive, true),
        sql`coalesce(${products.sourceUpdatedAt}, ${products.lastSyncedAt}) <= ${input.staleBefore.toISOString()}::timestamptz`,
        or(
          isNull(catalogPriorityRefreshes.productId),
          lte(catalogPriorityRefreshes.deduplicateUntil, input.now),
        ),
      ))
      .orderBy(asc(freshness))
      .limit(input.limit);
  }
}
