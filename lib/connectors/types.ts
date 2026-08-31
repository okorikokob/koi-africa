import type { Product, ProductVariant } from "@/types";

export type VariantRevalidationRequest = {
  product: Product;
  variant: ProductVariant;
};

export type VariantRevalidationResult = {
  productId: string;
  variantId: string;
  sku?: string;
  gtin?: string;
  canonicalUrl: string;
  price: number;
  currency: string;
  available: true;
  checkedAt: string;
};

export interface BrandConnector {
  readonly brand: string;
  supports(product: Product): boolean;
  getProducts(): Product[];
  getProductById(id: string): Product | null;
  revalidateVariant(request: VariantRevalidationRequest): Promise<VariantRevalidationResult>;
}

export class ConnectorRevalidationError extends Error {
  readonly code:
    | "configuration_unavailable"
    | "product_identity_mismatch"
    | "variant_identity_mismatch"
    | "variant_unavailable"
    | "price_changed"
    | "source_unavailable";

  constructor(code: ConnectorRevalidationError["code"], message: string) {
    super(message);
    this.name = "ConnectorRevalidationError";
    this.code = code;
  }
}

export function isConnectorRevalidationError(error: unknown): error is ConnectorRevalidationError {
  return error instanceof ConnectorRevalidationError;
}
