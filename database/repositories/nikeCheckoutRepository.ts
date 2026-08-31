import { and, eq } from "drizzle-orm";
import type { db } from "@/database/client";
import { products, productVariants, storefronts } from "@/database/schema";
import type { NikeCheckoutRecord, NikeCheckoutRepository as CheckoutRepository } from "@/lib/nike-checkout-validation";

type Database = typeof db;

export class NikeCheckoutRepository implements CheckoutRepository {
  constructor(private readonly database: Database) {}

  async findCheckoutRecord(productId: string, sourceVariantId: string): Promise<NikeCheckoutRecord | null> {
    const [product] = await this.database.select({ product: products }).from(products)
      .innerJoin(storefronts, eq(products.storefrontId, storefronts.id))
      .where(and(
        eq(products.id, productId),
        eq(products.provider, "apify"),
        eq(storefronts.sourceStorefrontId, "nike-us"),
      ))
      .limit(1);
    if (!product) return null;

    const [variant] = await this.database.select().from(productVariants).where(and(
      eq(productVariants.productId, productId),
      eq(productVariants.sourceVariantId, sourceVariantId),
      eq(productVariants.provider, "apify"),
    )).limit(1);

    return { product: product.product, variant: variant ?? null };
  }
}
