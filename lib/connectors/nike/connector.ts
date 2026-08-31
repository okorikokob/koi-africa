import { getLocalNikeProductById, getLocalNikeProducts } from "@/lib/local-nike-catalog";
import {
  ConnectorRevalidationError,
  type BrandConnector,
  type VariantRevalidationRequest,
  type VariantRevalidationResult,
} from "@/lib/connectors/types";
import {
  BrightDataNikeOfficialSourceClient,
  type NikeOfficialSourceClient,
} from "@/lib/connectors/nike/official-source";
import type { ProductVariant } from "@/types";

const LOCAL_NIKE_PREFIX = "local-nike-";

function canonicalUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  url.search = "";
  return url.toString().replace(/\/$/, "");
}

function isOfficialNikeUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "nike.com" || hostname.endsWith(".nike.com");
  } catch {
    return false;
  }
}

function money(value: string | null): number {
  const parsed = Number((value ?? "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ConnectorRevalidationError(
      "source_unavailable",
      "Nike returned an invalid price. Please try again later.",
    );
  }
  return parsed;
}

function options(variant: ProductVariant): Record<string, string> {
  return Object.fromEntries(variant.options.map((option) => [option.name.toLowerCase(), option.label]));
}

function samePrice(left: number, right: number): boolean {
  return Math.round(left * 100) === Math.round(right * 100);
}

export class NikeConnector implements BrandConnector {
  readonly brand = "Nike";

  constructor(
    private readonly sourceClient: NikeOfficialSourceClient = new BrightDataNikeOfficialSourceClient(),
  ) {}

  supports(product: VariantRevalidationRequest["product"]): boolean {
    return product.brandName.toLowerCase() === "nike" && product.id.startsWith(LOCAL_NIKE_PREFIX);
  }

  getProducts() {
    return getLocalNikeProducts();
  }

  getProductById(id: string) {
    return getLocalNikeProductById(id);
  }

  async revalidateVariant({ product, variant }: VariantRevalidationRequest): Promise<VariantRevalidationResult> {
    if (!this.supports(product)) {
      throw new ConnectorRevalidationError(
        "product_identity_mismatch",
        "The selected product is not an official Nike catalogue item.",
      );
    }

    const sourceProductId = product.id.slice(LOCAL_NIKE_PREFIX.length);
    const rawProductUrl = product.productPageUrl ?? product.vendorUrl;
    if (!isOfficialNikeUrl(rawProductUrl)) {
      throw new ConnectorRevalidationError(
        "product_identity_mismatch",
        "The selected product is not linked to an official Nike page.",
      );
    }
    const productUrl = canonicalUrl(rawProductUrl);
    const live = await this.sourceClient.fetchVariant({
      canonicalUrl: productUrl,
      sourceProductId,
      sourceVariantId: variant.id,
    });

    if (live.store_country !== "US" || canonicalUrl(live.url) !== productUrl || live.group_id !== sourceProductId) {
      throw new ConnectorRevalidationError(
        "product_identity_mismatch",
        "The selected Nike product could not be verified. Please refresh and try again.",
      );
    }
    if (live.variant_id !== variant.id || live.mpn !== variant.sku || live.gtin !== variant.gtin) {
      throw new ConnectorRevalidationError(
        "variant_identity_mismatch",
        "The selected Nike variant changed. Please select it again.",
      );
    }

    const cachedOptions = options(variant);
    const liveOptions = Object.fromEntries(
      live.variant_attributes.map(({ name, value }) => [name.toLowerCase(), value]),
    );
    if (
      Object.entries(cachedOptions).some(([name, value]) => liveOptions[name] !== value)
    ) {
      throw new ConnectorRevalidationError(
        "variant_identity_mismatch",
        "The selected Nike size or colour changed. Please select it again.",
      );
    }
    if (live.availability !== "in_stock") {
      throw new ConnectorRevalidationError(
        "variant_unavailable",
        "The selected Nike variant is no longer available.",
      );
    }

    const livePrice = money(live.sale_price ?? live.price);
    if (!samePrice(livePrice, variant.price)) {
      throw new ConnectorRevalidationError(
        "price_changed",
        "The selected Nike variant price changed. Please refresh your cart.",
      );
    }

    return {
      productId: product.id,
      variantId: variant.id,
      sku: variant.sku,
      gtin: variant.gtin,
      canonicalUrl: productUrl,
      price: livePrice,
      currency: variant.currency,
      available: true,
      checkedAt: new Date().toISOString(),
    };
  }
}
