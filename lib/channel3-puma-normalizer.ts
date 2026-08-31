import type { Channel3Api } from "@channel3/sdk";
import type {
  Channel3PumaFixtureProduct,
  Channel3SkipReason,
} from "@/lib/channel3-puma-types";

export type Channel3NormalizationResult =
  | { product: Channel3PumaFixtureProduct; reason?: never }
  | { product?: never; reason: Channel3SkipReason };

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function selectOffer(offers: Channel3Api.ProductOffer[] | undefined): Channel3Api.ProductOffer | null {
  return offers?.find((offer) =>
    offer.domain.trim().toLowerCase() === "us.puma.com"
      && offer.availability === "InStock"
      && Number.isFinite(offer.price.price)
      && offer.price.price > 0
      && /^[A-Z]{3}$/.test(offer.price.currency)
      && isHttpUrl(offer.url),
  ) ?? null;
}

export function normalizeChannel3PumaProduct(product: Channel3Api.Product): Channel3NormalizationResult {
  if (!product.id.trim()) return { reason: "missing_product_id" };
  if (!product.title.trim()) return { reason: "missing_title" };
  if (!product.brands?.some((brand) => brand.name.trim().toLowerCase() === "puma")) {
    return { reason: "missing_brand" };
  }

  const offer = selectOffer(product.offers);
  if (!offer) return { reason: "missing_offer" };

  const imageUrls = [...new Set((product.images ?? [])
    .flatMap((image) => [image.cleaned_url, image.url])
    .filter((url): url is string => typeof url === "string" && isHttpUrl(url)))]
    .slice(0, 20);
  if (imageUrls.length === 0) return { reason: "missing_image" };

  const variantOptions = product.variants?.options ?? [];
  const selectedOptions = product.variants?.selected ?? [];
  const selectedByName = new Map(selectedOptions.map((option) => [option.name.toLowerCase(), option.label]));
  const selectableOptions = variantOptions.filter((option) => option.values.some((value) =>
    value.exists && value.available !== "OutOfStock",
  ));
  if (variantOptions.some((option) => option.values.length > 0 && !selectableOptions.includes(option))) {
    return { reason: "unavailable_variants" };
  }
  if (selectableOptions.some((option) => {
    const selected = selectedByName.get(option.name.toLowerCase());
    return !option.values.some((value) =>
      value.exists && value.available !== "OutOfStock" && value.label === selected,
    );
  })) {
    return { reason: "ambiguous_variants" };
  }

  const currentMinor = Math.round(offer.price.price * 100);
  const compareAtMinor = offer.price.compare_at_price == null
    ? null
    : Math.round(offer.price.compare_at_price * 100);
  const originalMinor = compareAtMinor != null && compareAtMinor > currentMinor ? compareAtMinor : currentMinor;
  const saleMinor = compareAtMinor != null && compareAtMinor > currentMinor ? currentMinor : null;
  const optionValues = Object.fromEntries(selectedOptions.map((option) => [option.name, option.label]));

  return {
    product: {
      sourceProductId: product.id,
      product: {
        canonical_url: offer.url,
        merchant_domain: "us.puma.com",
        title: product.title.trim(),
        subtitle: product.gender ?? null,
        description: product.description?.trim() || null,
        product_type: product.category?.title ?? null,
        currency: offer.price.currency,
        price_minor: originalMinor,
        sale_price_minor: saleMinor,
        availability_status: "in_stock",
        available: true,
      },
      images: imageUrls.map((url, position) => ({
        official_cdn_url: url,
        alt_text: product.title,
        position,
        color_name: null,
      })),
      variants: selectedOptions.length === 0 ? [] : [{
        source_variant_id: product.id,
        sku: null,
        gtin: null,
        option_values: optionValues,
        currency: offer.price.currency,
        price_minor: originalMinor,
        sale_price_minor: saleMinor,
        availability_status: "in_stock",
        available: true,
      }],
    },
  };
}
