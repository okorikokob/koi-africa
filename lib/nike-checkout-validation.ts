export const DEFAULT_NIKE_CHECKOUT_FRESHNESS_MINUTES = 360;

export type NikeCheckoutAvailability = "in_stock" | "limited" | "pre_order" | "out_of_stock" | "unknown";

export type NikeCheckoutRecord = {
  product: {
    id: string;
    sourceProductId: string;
    canonicalUrl: string;
    isActive: boolean;
    available: boolean;
    availabilityStatus: NikeCheckoutAvailability;
    lastSyncedAt: Date;
    sourceUpdatedAt: Date | null;
  };
  variant: {
    sourceVariantId: string;
    sku: string | null;
    gtin: string | null;
    optionValues: Record<string, string>;
    currency: string;
    priceMinor: number | null;
    isActive: boolean;
    available: boolean;
    availabilityStatus: NikeCheckoutAvailability;
    lastSeenAt: Date;
    sourceUpdatedAt: Date | null;
  } | null;
};

export interface NikeCheckoutRepository {
  findCheckoutRecord(productId: string, sourceVariantId: string): Promise<NikeCheckoutRecord | null>;
}

export interface NikePriorityRefreshRequester {
  request(input: { productId: string; sourceProductId: string; canonicalUrl: string }): Promise<{ triggered: boolean }>;
}

export type NikeCheckoutValidationCode =
  | "PRODUCT_UNAVAILABLE"
  | "VARIANT_UNAVAILABLE"
  | "CATALOG_STALE";

export class NikeCheckoutValidationError extends Error {
  constructor(
    readonly code: NikeCheckoutValidationCode,
    message: string,
  ) {
    super(message);
    this.name = "NikeCheckoutValidationError";
  }
}

export function nikeCheckoutFreshnessMinutes(
  environment: Record<string, string | undefined> = process.env,
): number {
  const configured = Number(environment.KOI_NIKE_CHECKOUT_FRESHNESS_MINUTES);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_NIKE_CHECKOUT_FRESHNESS_MINUTES;
}

function isPurchasable(status: NikeCheckoutAvailability, available: boolean): boolean {
  return available && (status === "in_stock" || status === "limited");
}

function effectiveFreshness(sourceUpdatedAt: Date | null, fallback: Date): Date {
  return sourceUpdatedAt ?? fallback;
}

export async function validateNikePostgresCheckout(
  input: { productId: string; sourceVariantId: string },
  dependencies: {
    repository: NikeCheckoutRepository;
    refreshRequester: NikePriorityRefreshRequester;
    now?: Date;
    freshnessMinutes?: number;
    onRefreshError?: (error: unknown) => void;
    scheduleBackgroundRefresh?: (task: () => Promise<void>) => void;
  },
): Promise<{
  variantId: string;
  sku: string | null;
  gtin: string | null;
  selectedOptions: Array<{ name: string; value: string }>;
  price: number;
  currency: string;
}> {
  const record = await dependencies.repository.findCheckoutRecord(input.productId, input.sourceVariantId);
  if (!record || !record.product.isActive || !isPurchasable(record.product.availabilityStatus, record.product.available)) {
    throw new NikeCheckoutValidationError(
      "PRODUCT_UNAVAILABLE",
      "This Nike product is no longer available.",
    );
  }

  const variant = record.variant;
  if (!variant || !variant.isActive || !isPurchasable(variant.availabilityStatus, variant.available)) {
    throw new NikeCheckoutValidationError(
      "VARIANT_UNAVAILABLE",
      "The selected Nike variant is no longer available.",
    );
  }

  if (variant.priceMinor == null || !Number.isSafeInteger(variant.priceMinor) || variant.priceMinor < 0) {
    throw new NikeCheckoutValidationError("VARIANT_UNAVAILABLE", "The selected Nike variant has no valid price.");
  }

  const now = dependencies.now ?? new Date();
  const freshnessMinutes = dependencies.freshnessMinutes ?? nikeCheckoutFreshnessMinutes();
  const cutoff = now.getTime() - freshnessMinutes * 60_000;
  const productFreshness = effectiveFreshness(record.product.sourceUpdatedAt, record.product.lastSyncedAt);
  const variantFreshness = effectiveFreshness(variant.sourceUpdatedAt, variant.lastSeenAt);
  if (productFreshness.getTime() < cutoff || variantFreshness.getTime() < cutoff) {
    const refreshTask = async () => {
      try {
        await dependencies.refreshRequester.request({
          productId: record.product.id,
          sourceProductId: record.product.sourceProductId,
          canonicalUrl: record.product.canonicalUrl,
        });
      } catch (error) {
        dependencies.onRefreshError?.(error);
      }
    };
    if (dependencies.scheduleBackgroundRefresh) dependencies.scheduleBackgroundRefresh(refreshTask);
    else void refreshTask();
  }

  return {
    variantId: variant.sourceVariantId,
    sku: variant.sku,
    gtin: variant.gtin,
    selectedOptions: Object.entries(variant.optionValues).map(([name, value]) => ({ name, value })),
    price: variant.priceMinor / 100,
    currency: variant.currency,
  };
}
