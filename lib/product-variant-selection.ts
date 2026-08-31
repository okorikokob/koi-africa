import type { ProductVariant } from "@/types";

export function normalizeProductOptionName(name: string): string {
  const normalized = name.trim().toLowerCase();
  return normalized === "colour" ? "color" : normalized;
}

function variantOptionValue(variant: ProductVariant, optionName: string): string | null {
  const normalizedName = normalizeProductOptionName(optionName);
  if (normalizedName === "stylecolor") return variant.styleColor ?? null;
  return variant.options.find(
    (option) => normalizeProductOptionName(option.name) === normalizedName,
  )?.label ?? null;
}

export function getAvailableProductOptionValues(
  variants: ProductVariant[],
  optionName: string,
  selections: Record<string, string | null>,
): Set<string> {
  const normalizedOptionName = normalizeProductOptionName(optionName);
  const relevantSelections = Object.entries(selections).filter(
    ([name, value]) => Boolean(value) && normalizeProductOptionName(name) !== normalizedOptionName,
  );
  return new Set(variants.flatMap((variant) => {
    if (!variant.available) return [];
    const matches = relevantSelections.every(([name, value]) => variantOptionValue(variant, name) === value);
    const value = variantOptionValue(variant, optionName);
    return matches && value ? [value] : [];
  }));
}

export function getInitialProductColour(
  colours: string[],
  verifiedGalleryImages: Record<string, string[]>,
): string | null {
  return colours.find((colour) => (verifiedGalleryImages[colour]?.length ?? 0) > 0)
    ?? colours[0]
    ?? null;
}

export function resolveProductVariant(
  variants: ProductVariant[],
  selections: Record<string, string | null>,
): ProductVariant | null {
  if (variants.length === 0) return null;
  if (variants.every((variant) => variant.options.length === 0)) return variants.length === 1 ? variants[0] : null;

  const normalizedSelections = Object.entries(selections)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([name, value]) => [normalizeProductOptionName(name), value] as const);
  const matches = (variant: ProductVariant) => normalizedSelections.every(
    ([name, value]) => variantOptionValue(variant, name) === value,
  );

  return variants.find((variant) => matches(variant) && variant.available) ?? variants.find(matches) ?? null;
}
