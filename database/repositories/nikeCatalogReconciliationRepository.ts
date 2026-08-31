import { and, asc, eq, inArray, notInArray } from "drizzle-orm";
import type { db } from "@/database/client";
import {
  brands,
  catalogSyncRunProducts,
  catalogSyncRuns,
  productColourways,
  productImages,
  products,
  productVariants,
  storefronts,
} from "@/database/schema";
import type {
  NikeProductSourceLineage,
  NikeReconciliationApplyResult,
  NikeReconciliationDeactivation,
  NikeReconciliationProductRecord,
  NikeReconciliationSnapshot,
} from "@/lib/nike-catalog-reconciliation";
import { mapNikePostgresProduct } from "@/lib/nike-postgres-product-mapper";

type Database = typeof db;

export type AuthoritativeNikeProductIdentity = {
  sourceProductId: string;
  canonicalUrl: string;
  styleCode: string | null;
};

export type AuthoritativeRunRegistration = {
  syncRunId: string;
  providerRunId: string;
  datasetId: string;
  productsRegistered: number;
  reusedPresence: boolean;
};

function normalizedUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function sourceRunId(providerRunId: string | null): string | null {
  if (!providerRunId) return null;
  return providerRunId.split(":shadow:", 1)[0] ?? providerRunId;
}

export class NikeCatalogReconciliationRepository {
  constructor(private readonly database: Database) {}

  async registerAuthoritativeRunPresence(
    providerRunId: string,
    datasetId: string,
    identities: AuthoritativeNikeProductIdentity[],
  ): Promise<AuthoritativeRunRegistration> {
    return this.database.transaction(async (tx) => {
      const [storedRun] = await tx.select({
        run: catalogSyncRuns,
        sourceStorefrontId: storefronts.sourceStorefrontId,
      }).from(catalogSyncRuns)
        .innerJoin(storefronts, eq(catalogSyncRuns.storefrontId, storefronts.id))
        .where(and(
          eq(catalogSyncRuns.provider, "apify"),
          eq(catalogSyncRuns.providerRunId, providerRunId),
        ))
        .limit(1);
      if (!storedRun) throw new Error("The requested Nike sync run was not found.");
      const run = storedRun.run;
      if (storedRun.sourceStorefrontId !== "nike-us") {
        throw new Error("Authoritative registration is restricted to the Nike US storefront.");
      }
      if (run.datasetId !== datasetId) throw new Error("The requested dataset does not belong to this sync run.");
      if (run.status !== "succeeded" || run.errorCount !== 0 || !run.completedAt) {
        throw new Error("Only a completed, successful, zero-error run can be authoritative.");
      }

      const uniqueIdentities = [...new Map(identities.map((identity) => [identity.sourceProductId, identity])).values()];
      if (uniqueIdentities.length !== identities.length) {
        throw new Error("The authoritative source contains duplicate product identities.");
      }
      if (
        uniqueIdentities.length !== run.productsUpserted
        || run.productsReceived !== run.productsUpserted + run.productsCoalesced
      ) {
        throw new Error("The authoritative source count does not match the completed sync run.");
      }

      const scopedProducts = await tx.select().from(products).where(and(
        eq(products.storefrontId, run.storefrontId),
        eq(products.provider, "apify"),
      ));
      const productsBySource = new Map(scopedProducts.map((product) => [product.sourceProductId, product]));
      const matchedProductIds = new Set<string>();
      const existingPresence = await tx.select({ productId: catalogSyncRunProducts.productId })
        .from(catalogSyncRunProducts)
        .where(eq(catalogSyncRunProducts.syncRunId, run.id));
      const observedAt = run.completedAt;

      for (const identity of uniqueIdentities) {
        const product = productsBySource.get(identity.sourceProductId);
        if (!product) throw new Error(`Authoritative product ${identity.sourceProductId} is missing from PostgreSQL.`);
        if (
          normalizedUrl(product.canonicalUrl) !== normalizedUrl(identity.canonicalUrl)
          || product.styleCode !== identity.styleCode
        ) {
          throw new Error(`Authoritative product ${identity.sourceProductId} has conflicting stored identity.`);
        }
        if (matchedProductIds.has(product.id)) {
          throw new Error("Multiple authoritative identities resolved to the same PostgreSQL product.");
        }
        matchedProductIds.add(product.id);

        await tx.insert(catalogSyncRunProducts).values({
          syncRunId: run.id,
          productId: product.id,
          observedSourceProductId: identity.sourceProductId,
          canonicalUrl: identity.canonicalUrl,
          styleCode: identity.styleCode,
          observedAt,
        }).onConflictDoUpdate({
          target: [catalogSyncRunProducts.syncRunId, catalogSyncRunProducts.productId],
          set: {
            observedSourceProductId: identity.sourceProductId,
            canonicalUrl: identity.canonicalUrl,
            styleCode: identity.styleCode,
            observedAt,
          },
        });
        await tx.update(products).set({
          lastSeenSyncRunId: run.id,
          missingSinceSyncRunId: null,
          deactivatedBySyncRunId: null,
          deactivatedAt: null,
          deactivationReason: null,
          updatedAt: new Date(),
        }).where(eq(products.id, product.id));
      }

      await tx.update(catalogSyncRuns).set({ authoritative: true, updatedAt: new Date() })
        .where(eq(catalogSyncRuns.id, run.id));
      return {
        syncRunId: run.id,
        providerRunId,
        datasetId,
        productsRegistered: matchedProductIds.size,
        reusedPresence: existingPresence.length === matchedProductIds.size,
      };
    });
  }

  async softDeactivateProducts(input: {
    providerRunId: string;
    candidates: NikeReconciliationDeactivation[];
  }): Promise<NikeReconciliationApplyResult> {
    return this.database.transaction(async (tx) => {
      const [storedRun] = await tx.select({
        run: catalogSyncRuns,
        sourceStorefrontId: storefronts.sourceStorefrontId,
      }).from(catalogSyncRuns)
        .innerJoin(storefronts, eq(catalogSyncRuns.storefrontId, storefronts.id))
        .where(and(
          eq(catalogSyncRuns.provider, "apify"),
          eq(catalogSyncRuns.providerRunId, input.providerRunId),
        ))
        .limit(1);
      if (!storedRun) throw new Error("The requested Nike sync run was not found.");
      const run = storedRun.run;
      if (storedRun.sourceStorefrontId !== "nike-us") {
        throw new Error("Reconciliation is restricted to the Apify Nike US storefront.");
      }
      if (!run.authoritative) throw new Error("A non-authoritative run cannot be reconciled.");
      if (run.status !== "succeeded" || run.errorCount !== 0 || !run.completedAt) {
        throw new Error("Only a completed, successful, zero-error run can be reconciled.");
      }
      if (run.productsUpserted <= 0 || run.productsReceived !== run.productsUpserted + run.productsCoalesced) {
        throw new Error("The authoritative run counts are incomplete or inconsistent.");
      }

      const presence = await tx.select({ productId: catalogSyncRunProducts.productId })
        .from(catalogSyncRunProducts)
        .where(eq(catalogSyncRunProducts.syncRunId, run.id));
      const presenceProductIds = [...new Set(presence.map((entry) => entry.productId))];
      if (presenceProductIds.length !== run.productsUpserted || presenceProductIds.length !== presence.length) {
        throw new Error("The authoritative run does not have complete product-presence lineage.");
      }

      const approvedProductIds = new Set(input.candidates.map((candidate) => candidate.productId));
      const approvedSourceIds = new Set(input.candidates.map((candidate) => candidate.sourceProductId));
      if (
        input.candidates.length === 0
        || approvedProductIds.size !== input.candidates.length
        || approvedSourceIds.size !== input.candidates.length
      ) {
        throw new Error("The approved Nike reconciliation candidates must be non-empty and unique.");
      }

      const activeMissingProducts = await tx.select({
        id: products.id,
        sourceProductId: products.sourceProductId,
      }).from(products).where(and(
        eq(products.storefrontId, run.storefrontId),
        eq(products.provider, "apify"),
        eq(products.isActive, true),
        notInArray(products.id, presenceProductIds),
      ));
      if (
        activeMissingProducts.length !== input.candidates.length
        || activeMissingProducts.some((product) => (
          !approvedProductIds.has(product.id) || !approvedSourceIds.has(product.sourceProductId)
        ))
      ) {
        throw new Error("The active Nike reconciliation candidates changed after preview approval.");
      }

      const deactivatedAt = new Date();
      const deactivatedProductIds: string[] = [];
      const deactivatedSourceProductIds: string[] = [];
      for (const candidate of input.candidates) {
        const [updated] = await tx.update(products).set({
          isActive: false,
          missingSinceSyncRunId: run.id,
          deactivatedBySyncRunId: run.id,
          deactivatedAt,
          deactivationReason: candidate.reason,
          updatedAt: deactivatedAt,
        }).where(and(
          eq(products.id, candidate.productId),
          eq(products.sourceProductId, candidate.sourceProductId),
          eq(products.storefrontId, run.storefrontId),
          eq(products.provider, "apify"),
          eq(products.isActive, true),
        )).returning({ id: products.id, sourceProductId: products.sourceProductId });
        if (!updated) throw new Error(`Nike product ${candidate.sourceProductId} could not be soft-deactivated.`);
        deactivatedProductIds.push(updated.id);
        deactivatedSourceProductIds.push(updated.sourceProductId);
      }

      return {
        syncRunId: run.id,
        providerRunId: input.providerRunId,
        deactivated: deactivatedProductIds.length,
        productIds: deactivatedProductIds,
        sourceProductIds: deactivatedSourceProductIds,
      };
    });
  }

  async loadSnapshot(providerRunId: string): Promise<NikeReconciliationSnapshot> {
    const [storedRun] = await this.database.select({
      run: catalogSyncRuns,
      sourceStorefrontId: storefronts.sourceStorefrontId,
    }).from(catalogSyncRuns)
      .innerJoin(storefronts, eq(catalogSyncRuns.storefrontId, storefronts.id))
      .where(and(
        eq(catalogSyncRuns.provider, "apify"),
        eq(catalogSyncRuns.providerRunId, providerRunId),
      ))
      .limit(1);
    if (!storedRun) return { run: null, presenceProductIds: [], products: [] };

    const rows = await this.database.select({
      product: products,
      brandName: brands.name,
      countryCode: storefronts.countryCode,
    }).from(products)
      .innerJoin(storefronts, eq(products.storefrontId, storefronts.id))
      .innerJoin(brands, eq(products.brandId, brands.id))
      .where(and(
        eq(products.storefrontId, storedRun.run.storefrontId),
        eq(products.provider, "apify"),
      ))
      .orderBy(asc(products.title), asc(products.id));
    const productIds = rows.map((row) => row.product.id);
    const syncRuns = await this.database.select().from(catalogSyncRuns)
      .where(and(
        eq(catalogSyncRuns.storefrontId, storedRun.run.storefrontId),
        eq(catalogSyncRuns.provider, "apify"),
      ))
      .orderBy(asc(catalogSyncRuns.startedAt));
    const [presence, colourways, images, variants] = productIds.length === 0
      ? [[], [], [], []]
      : await Promise.all([
          this.database.select({ productId: catalogSyncRunProducts.productId })
            .from(catalogSyncRunProducts)
            .where(eq(catalogSyncRunProducts.syncRunId, storedRun.run.id)),
          this.database.select().from(productColourways)
            .where(and(inArray(productColourways.productId, productIds), eq(productColourways.isActive, true)))
            .orderBy(asc(productColourways.position), asc(productColourways.id)),
          this.database.select().from(productImages)
            .where(inArray(productImages.productId, productIds))
            .orderBy(asc(productImages.position), asc(productImages.id)),
          this.database.select().from(productVariants)
            .where(and(inArray(productVariants.productId, productIds), eq(productVariants.isActive, true)))
            .orderBy(asc(productVariants.id)),
        ]);

    const reconciliationProducts: NikeReconciliationProductRecord[] = rows.map((row) => {
      const productColourwayRows = colourways.filter((colourway) => colourway.productId === row.product.id);
      const productImageRows = images.filter((image) => image.productId === row.product.id);
      const productVariantRows = variants.filter((variant) => variant.productId === row.product.id);
      const mapped = mapNikePostgresProduct({
        ...row,
        colourways: productColourwayRows,
        images: productImageRows,
        variants: productVariantRows,
      });
      const recordedRun = row.product.lastSeenSyncRunId
        ? syncRuns.find((run) => run.id === row.product.lastSeenSyncRunId)
        : undefined;
      const legacyRun = recordedRun ? undefined : [...syncRuns].reverse().find((run) => (
        run.completedAt !== null
        && run.startedAt <= row.product.lastSyncedAt
        && row.product.lastSyncedAt <= run.completedAt
      ));
      const attributedRun = recordedRun ?? legacyRun;
      const sourceLineage: NikeProductSourceLineage | null = attributedRun ? {
        syncRunId: attributedRun.id,
        providerRunId: attributedRun.providerRunId,
        sourceRunId: sourceRunId(attributedRun.providerRunId),
        datasetId: attributedRun.datasetId,
        attribution: recordedRun ? "recorded" : "legacy_time_window",
      } : null;
      return {
        id: row.product.id,
        sourceProductId: row.product.sourceProductId,
        title: row.product.title,
        canonicalUrl: row.product.canonicalUrl,
        styleCode: row.product.styleCode,
        isActive: row.product.isActive,
        lastSeenSyncRunId: row.product.lastSeenSyncRunId,
        lastSyncedAt: row.product.lastSyncedAt,
        verifiedColourwayCount: productColourwayRows.length,
        imageCount: productImageRows.length,
        activeVariantCount: productVariantRows.length,
        colourwayStyleColors: productColourwayRows.map((colourway) => colourway.styleColor),
        renderabilityReason: mapped.reason,
        sourceLineage,
      };
    });

    return {
      run: {
        id: storedRun.run.id,
        providerRunId: storedRun.run.providerRunId ?? "",
        datasetId: storedRun.run.datasetId,
        provider: storedRun.run.provider,
        sourceStorefrontId: storedRun.sourceStorefrontId,
        authoritative: storedRun.run.authoritative,
        status: storedRun.run.status,
        productsReceived: storedRun.run.productsReceived,
        productsUpserted: storedRun.run.productsUpserted,
        productsCoalesced: storedRun.run.productsCoalesced,
        errorCount: storedRun.run.errorCount,
        completedAt: storedRun.run.completedAt,
      },
      presenceProductIds: presence.map((entry) => entry.productId),
      products: reconciliationProducts,
    };
  }
}
