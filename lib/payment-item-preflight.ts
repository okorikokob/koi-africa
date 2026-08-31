import {
  brandConnectorRegistry,
  type BrandConnectorRegistry,
} from "@/lib/connectors/registry";
import { ConnectorRevalidationError } from "@/lib/connectors/types";
import type { Product, ProductVariant } from "@/types";

export type PaymentItemPreflightResult = {
  variant?: ProductVariant;
  price: number;
  currency: string;
};

export async function preflightPaymentItem(
  product: Product,
  requestedVariantId: string | undefined,
  registry: BrandConnectorRegistry = brandConnectorRegistry,
): Promise<PaymentItemPreflightResult> {
  const variant = requestedVariantId
    ? product.variants?.find((candidate) => candidate.id === requestedVariantId)
    : undefined;
  if (requestedVariantId && (!variant || !variant.available)) {
    throw new ConnectorRevalidationError(
      "variant_unavailable",
      `Selected variant is no longer available for ${product.title}.`,
    );
  }

  const connector = registry.forProduct(product);
  if (!connector) {
    return {
      variant,
      price: variant?.price ?? product.priceAmount,
      currency: variant?.currency ?? product.priceCurrency,
    };
  }
  if (!variant) {
    throw new ConnectorRevalidationError(
      "variant_identity_mismatch",
      `Select an exact ${connector.brand} variant before checkout.`,
    );
  }

  const live = await connector.revalidateVariant({ product, variant });
  return { variant, price: live.price, currency: live.currency };
}
