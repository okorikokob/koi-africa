import { and, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import type { db } from "@/database/client";
import { shippingRateCards } from "@/database/schema";

type Database = typeof db;

export class ShippingRateCardRepository {
  constructor(private readonly database: Database) {}

  async listApplicable(input: {
    provider: string;
    originZoneId: string;
    destinationZoneId: string;
    effectiveAt: Date;
  }): Promise<Array<typeof shippingRateCards.$inferSelect>> {
    const rows = await this.database.select().from(shippingRateCards).where(and(
      eq(shippingRateCards.provider, input.provider),
      eq(shippingRateCards.destinationZoneId, input.destinationZoneId),
      or(eq(shippingRateCards.originZoneId, input.originZoneId), isNull(shippingRateCards.originZoneId)),
      eq(shippingRateCards.isActive, true),
      lte(shippingRateCards.effectiveFrom, input.effectiveAt),
      or(isNull(shippingRateCards.effectiveUntil), gt(shippingRateCards.effectiveUntil, input.effectiveAt)),
    )).orderBy(desc(shippingRateCards.effectiveFrom), desc(shippingRateCards.createdAt));

    return rows.sort((left, right) => {
      const leftExact = left.originZoneId === input.originZoneId ? 1 : 0;
      const rightExact = right.originZoneId === input.originZoneId ? 1 : 0;
      return rightExact - leftExact;
    });
  }
}
