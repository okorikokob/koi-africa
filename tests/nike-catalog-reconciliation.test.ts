import assert from "node:assert/strict";
import test from "node:test";
import {
  applyApprovedNikeReconciliation,
  previewNikeReconciliation,
  type NikeReconciliationApplyRepository,
  type NikeReconciliationDeactivation,
  type NikeReconciliationProductRecord,
  type NikeReconciliationRepository,
  type NikeReconciliationSnapshot,
} from "@/lib/nike-catalog-reconciliation";

function product(
  id: string,
  sourceProductId: string,
  styleCode: string,
  colourwayStyleColors: string[] = [],
  renderabilityReason: string | null = null,
): NikeReconciliationProductRecord {
  return {
    id,
    sourceProductId,
    title: sourceProductId,
    canonicalUrl: `https://www.nike.com/t/${sourceProductId}`,
    styleCode,
    isActive: true,
    lastSeenSyncRunId: null,
    lastSyncedAt: new Date("2026-08-21T11:10:00.000Z"),
    verifiedColourwayCount: colourwayStyleColors.length,
    imageCount: 5,
    activeVariantCount: 10,
    colourwayStyleColors,
    renderabilityReason,
    sourceLineage: {
      syncRunId: "legacy-run-row",
      providerRunId: "legacy-source-run:shadow:gallery-colour-v4",
      sourceRunId: "legacy-source-run",
      datasetId: "legacy-dataset",
      attribution: "legacy_time_window",
    },
  };
}

function snapshot(overrides: Partial<NikeReconciliationSnapshot> = {}): NikeReconciliationSnapshot {
  return {
    run: {
      id: "run-row",
      providerRunId: "provider-run",
      datasetId: "dataset",
      provider: "apify",
      sourceStorefrontId: "nike-us",
      authoritative: true,
      status: "succeeded",
      productsReceived: 2,
      productsUpserted: 2,
      productsCoalesced: 0,
      errorCount: 0,
      completedAt: new Date("2026-08-21T14:03:05.000Z"),
    },
    presenceProductIds: ["current-one", "current-two"],
    products: [
      product("current-one", "current-1", "IR0238", ["IM5150-600"]),
      product("current-two", "current-2", "CURRENT"),
      product("legacy-duplicate", "legacy-duplicate", "IM5150"),
      product("legacy-stale", "legacy-stale", "STALE"),
    ],
    ...overrides,
  };
}

class FakeRepository implements NikeReconciliationRepository {
  constructor(private readonly value: NikeReconciliationSnapshot) {}
  async loadSnapshot(): Promise<NikeReconciliationSnapshot> { return this.value; }
}

class FakeApplyRepository extends FakeRepository implements NikeReconciliationApplyRepository {
  applied: NikeReconciliationDeactivation[] | null = null;

  async softDeactivateProducts(input: {
    providerRunId: string;
    candidates: NikeReconciliationDeactivation[];
  }) {
    this.applied = input.candidates;
    return {
      syncRunId: "run-row",
      providerRunId: input.providerRunId,
      deactivated: input.candidates.length,
      productIds: input.candidates.map((candidate) => candidate.productId),
      sourceProductIds: input.candidates.map((candidate) => candidate.sourceProductId),
    };
  }
}

test("previews stale and style-duplicate products without mutating catalogue state", async () => {
  const preview = await previewNikeReconciliation("provider-run", new FakeRepository(snapshot()));
  assert.equal(preview.dryRun, true);
  assert.equal(preview.eligibleToApplyAfterApproval, true);
  assert.deepEqual(preview.counts, {
    scopedProducts: 4,
    activeProducts: 4,
    seenProducts: 2,
    stale: 1,
    duplicate: 1,
    unresolved: 0,
    wouldDeactivate: 2,
  });
  const duplicate = preview.candidates.find((candidate) => candidate.sourceProductId === "legacy-duplicate");
  assert.equal(duplicate?.classification, "duplicate");
  assert.deepEqual(duplicate?.duplicateMatches.styleProductIds, ["current-1"]);
  assert.deepEqual(duplicate?.duplicateMatches.styleColors, ["IM5150-600"]);
  assert.equal(duplicate?.sourceLineage?.sourceRunId, "legacy-source-run");
  assert.equal(
    preview.candidates.find((candidate) => candidate.sourceProductId === "legacy-stale")?.classification,
    "stale",
  );
});

test("fails closed for non-authoritative, incomplete, or failed runs", async () => {
  const nonAuthoritative = snapshot({ run: { ...snapshot().run!, authoritative: false } });
  await assert.rejects(
    previewNikeReconciliation("provider-run", new FakeRepository(nonAuthoritative)),
    /non-authoritative/,
  );

  const incomplete = snapshot({ presenceProductIds: ["current-one"] });
  await assert.rejects(
    previewNikeReconciliation("provider-run", new FakeRepository(incomplete)),
    /complete product-presence lineage/,
  );

  const failed = snapshot({ run: { ...snapshot().run!, status: "failed", errorCount: 1 } });
  await assert.rejects(
    previewNikeReconciliation("provider-run", new FakeRepository(failed)),
    /completed, successful, zero-error/,
  );
});

test("marks unsafe missing products unresolved and blocks apply eligibility", async () => {
  const unsafe = product("legacy-unsafe", "legacy-unsafe", "UNSAFE", [], "missing_images");
  const value = snapshot({ products: [...snapshot().products, unsafe] });
  const preview = await previewNikeReconciliation("provider-run", new FakeRepository(value));
  assert.equal(preview.eligibleToApplyAfterApproval, false);
  assert.equal(preview.counts.unresolved, 1);
  assert.equal(
    preview.candidates.find((candidate) => candidate.sourceProductId === "legacy-unsafe")?.classification,
    "unresolved",
  );
});

test("applies only the exact approved preview and preserves classification reasons", async () => {
  const repository = new FakeApplyRepository(snapshot());
  const result = await applyApprovedNikeReconciliation(
    "provider-run",
    ["legacy-stale", "legacy-duplicate"],
    repository,
  );

  assert.equal(result.deactivated, 2);
  assert.deepEqual(result.sourceProductIds.sort(), ["legacy-duplicate", "legacy-stale"]);
  assert.deepEqual(repository.applied, [
    {
      productId: "legacy-duplicate",
      sourceProductId: "legacy-duplicate",
      reason: "superseded_by_authoritative_style_identity",
    },
    {
      productId: "legacy-stale",
      sourceProductId: "legacy-stale",
      reason: "absent_from_authoritative_run",
    },
  ]);
});

test("fails closed when approval and current candidates differ or approval is repeated", async () => {
  const repository = new FakeApplyRepository(snapshot());
  await assert.rejects(
    applyApprovedNikeReconciliation("provider-run", ["legacy-stale"], repository),
    /do not exactly match/,
  );
  assert.equal(repository.applied, null);

  const afterApply = snapshot({
    products: snapshot().products.map((entry) => (
      entry.id.startsWith("legacy-") ? { ...entry, isActive: false } : entry
    )),
  });
  await assert.rejects(
    applyApprovedNikeReconciliation(
      "provider-run",
      ["legacy-stale", "legacy-duplicate"],
      new FakeApplyRepository(afterApply),
    ),
    /do not exactly match/,
  );
});

test("does not apply a preview containing unresolved products", async () => {
  const unsafe = product("legacy-unsafe", "legacy-unsafe", "UNSAFE", [], "missing_images");
  const repository = new FakeApplyRepository(snapshot({ products: [...snapshot().products, unsafe] }));
  await assert.rejects(
    applyApprovedNikeReconciliation(
      "provider-run",
      ["legacy-stale", "legacy-duplicate", "legacy-unsafe"],
      repository,
    ),
    /not safe to apply/,
  );
  assert.equal(repository.applied, null);
});
