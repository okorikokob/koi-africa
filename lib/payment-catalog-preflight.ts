import type { Product } from "@/types";

export type PaymentCatalogPreflight = {
  variantId: string | null;
  sku: string | null;
  gtin: string | null;
  selectedOptions: Array<{ name: string; value: string }>;
  price: number;
  currency: string;
};

export async function preflightPaymentCatalogItem(
  input: {
    product: Product;
    requestedVariantId?: string;
    usePostgresNike: boolean;
  },
  dependencies: {
    postgresNike: (productId: string, variantId: string) => Promise<PaymentCatalogPreflight>;
    legacy: (product: Product, variantId?: string) => Promise<{
      variant?: { id: string; sku?: string; gtin?: string; options: Array<{ name: string; label: string }> };
      price: number;
      currency: string;
    }>;
    missingNikeVariant: () => Error;
  },
): Promise<PaymentCatalogPreflight> {
  if (input.usePostgresNike) {
    if (!input.requestedVariantId) throw dependencies.missingNikeVariant();
    return dependencies.postgresNike(input.product.id, input.requestedVariantId);
  }

  const legacy = await dependencies.legacy(input.product, input.requestedVariantId);
  return {
    variantId: legacy.variant?.id ?? null,
    sku: legacy.variant?.sku ?? null,
    gtin: legacy.variant?.gtin ?? null,
    selectedOptions: legacy.variant?.options.map((option) => ({ name: option.name, value: option.label })) ?? [],
    price: legacy.price,
    currency: legacy.currency,
  };
}
