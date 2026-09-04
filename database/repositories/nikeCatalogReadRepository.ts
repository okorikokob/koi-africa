import { and, asc, eq, inArray } from "drizzle-orm";
import type { db } from "@/database/client";
import { brands, productColourways, productImages, products, productVariants, storefronts } from "@/database/schema";

type Database = typeof db;

export type NikeCatalogReadRow = {
  product: typeof products.$inferSelect;
  brandName: string;
  countryCode: string;
  colourways: Array<typeof productColourways.$inferSelect>;
  images: Array<typeof productImages.$inferSelect>;
  variants: Array<typeof productVariants.$inferSelect>;
};

export class NikeCatalogReadRepository {
  constructor(private readonly database: Database) {}

  async listProducts(): Promise<NikeCatalogReadRow[]> {
    const rows = await this.database.select({
      product: products,
      brandName: brands.name,
      countryCode: storefronts.countryCode,
    }).from(products)
      .innerJoin(storefronts, eq(products.storefrontId, storefronts.id))
      .innerJoin(brands, eq(products.brandId, brands.id))
      .where(and(
        eq(products.provider, "apify"),
        eq(storefronts.sourceStorefrontId, "nike-us"),
        eq(products.isActive, true),
      ))
      .orderBy(asc(products.title), asc(products.id));

    return this.attachChildren(rows);
  }

  async findProductById(id: string): Promise<NikeCatalogReadRow | null> {
    const [row] = await this.database.select({
      product: products,
      brandName: brands.name,
      countryCode: storefronts.countryCode,
    }).from(products)
      .innerJoin(storefronts, eq(products.storefrontId, storefronts.id))
      .innerJoin(brands, eq(products.brandId, brands.id))
      .where(and(
        eq(products.id, id),
        eq(products.provider, "apify"),
        eq(storefronts.sourceStorefrontId, "nike-us"),
        eq(products.isActive, true),
      ))
      .limit(1);
    if (!row) return null;
    return (await this.attachChildren([row]))[0] ?? null;
  }

  private async attachChildren(
    rows: Array<{ product: typeof products.$inferSelect; brandName: string; countryCode: string }>,
  ): Promise<NikeCatalogReadRow[]> {
    if (rows.length === 0) return [];
    const productIds = rows.map((row) => row.product.id);
    const [colourways, images, variants] = await Promise.all([
      this.database.select().from(productColourways)
        .where(and(inArray(productColourways.productId, productIds), eq(productColourways.isActive, true)))
        .orderBy(asc(productColourways.position), asc(productColourways.id)),
      this.database.select().from(productImages)
        .where(and(inArray(productImages.productId, productIds), eq(productImages.isActive, true)))
        .orderBy(asc(productImages.position), asc(productImages.id)),
      this.database.select().from(productVariants)
        .where(and(inArray(productVariants.productId, productIds), eq(productVariants.isActive, true)))
        .orderBy(asc(productVariants.id)),
    ]);

    return rows.map((row) => ({
      ...row,
      colourways: colourways.filter((colourway) => colourway.productId === row.product.id),
      images: images.filter((image) => image.productId === row.product.id),
      variants: variants.filter((variant) => variant.productId === row.product.id),
    }));
  }
}
