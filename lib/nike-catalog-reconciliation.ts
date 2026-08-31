export type NikeReconciliationRun = {
  id: string;
  providerRunId: string;
  datasetId: string | null;
  provider: string;
  sourceStorefrontId: string;
  authoritative: boolean;
  status: "running" | "succeeded" | "partial" | "failed";
  productsReceived: number;
  productsUpserted: number;
  productsCoalesced: number;
  errorCount: number;
  completedAt: Date | null;
};

export type NikeReconciliationProductRecord = {
  id: string;
  sourceProductId: string;
  title: string;
  canonicalUrl: string;
  styleCode: string | null;
  isActive: boolean;
  lastSeenSyncRunId: string | null;
  lastSyncedAt: Date;
  verifiedColourwayCount: number;
  imageCount: number;
  activeVariantCount: number;
  colourwayStyleColors: string[];
  renderabilityReason: string | null;
  sourceLineage: NikeProductSourceLineage | null;
};

export type NikeProductSourceLineage = {
  syncRunId: string;
  providerRunId: string | null;
  sourceRunId: string | null;
  datasetId: string | null;
  attribution: "recorded" | "legacy_time_window";
};

export type NikeReconciliationSnapshot = {
  run: NikeReconciliationRun | null;
  presenceProductIds: string[];
  products: NikeReconciliationProductRecord[];
};

export interface NikeReconciliationRepository {
  loadSnapshot(providerRunId: string): Promise<NikeReconciliationSnapshot>;
}

export type NikeReconciliationDeactivation = {
  productId: string;
  sourceProductId: string;
  reason: "absent_from_authoritative_run" | "superseded_by_authoritative_style_identity";
};

export type NikeReconciliationApplyResult = {
  syncRunId: string;
  providerRunId: string;
  deactivated: number;
  productIds: string[];
  sourceProductIds: string[];
};

export interface NikeReconciliationApplyRepository extends NikeReconciliationRepository {
  softDeactivateProducts(input: {
    providerRunId: string;
    candidates: NikeReconciliationDeactivation[];
  }): Promise<NikeReconciliationApplyResult>;
}

export type NikeReconciliationCandidate = {
  productId: string;
  sourceProductId: string;
  title: string;
  canonicalUrl: string;
  styleCode: string | null;
  lastSeenSyncRunId: string | null;
  lastSyncedAt: string;
  sourceLineage: NikeProductSourceLineage | null;
  verifiedColourwayCount: number;
  imageCount: number;
  activeVariantCount: number;
  safelyRenderable: boolean;
  renderabilityReason: string | null;
  duplicateMatches: {
    sourceProductIds: string[];
    canonicalProductIds: string[];
    styleProductIds: string[];
    styleColors: string[];
  };
  classification: "stale" | "duplicate" | "unresolved";
};

export type NikeReconciliationPreview = {
  dryRun: true;
  eligibleToApplyAfterApproval: boolean;
  run: {
    id: string;
    providerRunId: string;
    datasetId: string | null;
    authoritative: true;
    status: "succeeded";
  };
  counts: {
    scopedProducts: number;
    activeProducts: number;
    seenProducts: number;
    stale: number;
    duplicate: number;
    unresolved: number;
    wouldDeactivate: number;
  };
  candidates: NikeReconciliationCandidate[];
};

function normalizedUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function styleBase(styleColor: string): string {
  const separator = styleColor.lastIndexOf("-");
  return separator > 0 ? styleColor.slice(0, separator) : styleColor;
}

function assertEligibleRun(
  run: NikeReconciliationRun | null,
  presenceCount: number,
): asserts run is NikeReconciliationRun & { authoritative: true; status: "succeeded" } {
  if (!run) throw new Error("The requested Nike sync run was not found.");
  if (run.provider !== "apify" || run.sourceStorefrontId !== "nike-us") {
    throw new Error("Reconciliation is restricted to the Apify Nike US storefront.");
  }
  if (!run.authoritative) throw new Error("A non-authoritative run cannot be reconciled.");
  if (run.status !== "succeeded" || run.errorCount !== 0 || !run.completedAt) {
    throw new Error("Only a completed, successful, zero-error run can be reconciled.");
  }
  if (run.productsUpserted <= 0 || run.productsReceived !== run.productsUpserted + run.productsCoalesced) {
    throw new Error("The authoritative run counts are incomplete or inconsistent.");
  }
  if (presenceCount !== run.productsUpserted) {
    throw new Error("The authoritative run does not have complete product-presence lineage.");
  }
}

export async function previewNikeReconciliation(
  providerRunId: string,
  repository: NikeReconciliationRepository,
): Promise<NikeReconciliationPreview> {
  const snapshot = await repository.loadSnapshot(providerRunId);
  assertEligibleRun(snapshot.run, snapshot.presenceProductIds.length);

  const presence = new Set(snapshot.presenceProductIds);
  if (presence.size !== snapshot.presenceProductIds.length) {
    throw new Error("The authoritative run contains duplicate product-presence entries.");
  }
  const currentProducts = snapshot.products.filter((product) => presence.has(product.id));
  if (currentProducts.length !== presence.size) {
    throw new Error("The authoritative run references products outside its Nike storefront scope.");
  }

  const candidates = snapshot.products
    .filter((product) => product.isActive && !presence.has(product.id))
    .map<NikeReconciliationCandidate>((product) => {
      const sourceMatches = currentProducts.filter(
        (current) => current.sourceProductId === product.sourceProductId,
      );
      const canonicalMatches = currentProducts.filter(
        (current) => normalizedUrl(current.canonicalUrl) === normalizedUrl(product.canonicalUrl),
      );
      const parentStyleMatches = product.styleCode
        ? currentProducts.filter((current) => current.styleCode === product.styleCode)
        : [];
      const colourwayStyleMatches = product.styleCode
        ? currentProducts.flatMap((current) => current.colourwayStyleColors
            .filter((styleColor) => styleColor === product.styleCode || styleBase(styleColor) === product.styleCode)
            .map((styleColor) => ({ productId: current.sourceProductId, styleColor })))
        : [];
      const styleProductIds = [...new Set([
        ...parentStyleMatches.map((match) => match.sourceProductId),
        ...colourwayStyleMatches.map((match) => match.productId),
      ])];
      const safelyRenderable = product.renderabilityReason === null;
      const hasDuplicate = sourceMatches.length > 0
        || canonicalMatches.length > 0
        || styleProductIds.length > 0;
      return {
        productId: product.id,
        sourceProductId: product.sourceProductId,
        title: product.title,
        canonicalUrl: product.canonicalUrl,
        styleCode: product.styleCode,
        lastSeenSyncRunId: product.lastSeenSyncRunId,
        lastSyncedAt: product.lastSyncedAt.toISOString(),
        sourceLineage: product.sourceLineage,
        verifiedColourwayCount: product.verifiedColourwayCount,
        imageCount: product.imageCount,
        activeVariantCount: product.activeVariantCount,
        safelyRenderable,
        renderabilityReason: product.renderabilityReason,
        duplicateMatches: {
          sourceProductIds: sourceMatches.map((match) => match.sourceProductId),
          canonicalProductIds: canonicalMatches.map((match) => match.sourceProductId),
          styleProductIds,
          styleColors: colourwayStyleMatches.map((match) => match.styleColor),
        },
        classification: !safelyRenderable ? "unresolved" : hasDuplicate ? "duplicate" : "stale",
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title) || left.sourceProductId.localeCompare(right.sourceProductId));

  const stale = candidates.filter((candidate) => candidate.classification === "stale").length;
  const duplicate = candidates.filter((candidate) => candidate.classification === "duplicate").length;
  const unresolved = candidates.filter((candidate) => candidate.classification === "unresolved").length;
  return {
    dryRun: true,
    eligibleToApplyAfterApproval: unresolved === 0,
    run: {
      id: snapshot.run.id,
      providerRunId: snapshot.run.providerRunId,
      datasetId: snapshot.run.datasetId,
      authoritative: true,
      status: "succeeded",
    },
    counts: {
      scopedProducts: snapshot.products.length,
      activeProducts: snapshot.products.filter((product) => product.isActive).length,
      seenProducts: currentProducts.length,
      stale,
      duplicate,
      unresolved,
      wouldDeactivate: candidates.length,
    },
    candidates,
  };
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export async function applyApprovedNikeReconciliation(
  providerRunId: string,
  approvedSourceProductIds: string[],
  repository: NikeReconciliationApplyRepository,
): Promise<NikeReconciliationApplyResult> {
  const approved = sortedUnique(approvedSourceProductIds);
  if (approved.length === 0 || approved.length !== approvedSourceProductIds.length) {
    throw new Error("The approved Nike candidate list must be non-empty and contain unique source product IDs.");
  }

  const preview = await previewNikeReconciliation(providerRunId, repository);
  if (!preview.eligibleToApplyAfterApproval || preview.counts.unresolved !== 0) {
    throw new Error("The Nike reconciliation preview is not safe to apply.");
  }
  const previewSourceIds = sortedUnique(preview.candidates.map((candidate) => candidate.sourceProductId));
  if (
    approved.length !== previewSourceIds.length
    || approved.some((sourceProductId, index) => sourceProductId !== previewSourceIds[index])
  ) {
    throw new Error("The current Nike reconciliation candidates do not exactly match the approved preview.");
  }

  const candidates: NikeReconciliationDeactivation[] = preview.candidates.map((candidate) => ({
    productId: candidate.productId,
    sourceProductId: candidate.sourceProductId,
    reason: candidate.classification === "duplicate"
      ? "superseded_by_authoritative_style_identity"
      : "absent_from_authoritative_run",
  }));
  const result = await repository.softDeactivateProducts({ providerRunId, candidates });
  const deactivatedSourceIds = sortedUnique(result.sourceProductIds);
  if (
    result.deactivated !== approved.length
    || deactivatedSourceIds.length !== approved.length
    || approved.some((sourceProductId, index) => sourceProductId !== deactivatedSourceIds[index])
  ) {
    throw new Error("The Nike reconciliation result did not match the approved preview.");
  }
  return result;
}
