import type { ProductVariant } from "@/types";

export function resolveProductVariant(
  variants: ProductVariant[],
  selections: Record<string, string | null>,
): ProductVariant | null {
  if (variants.length === 0) return null;
  if (variants.every((variant) => variant.options.length === 0)) return variants.length === 1 ? variants[0] : null;

  const normalizedSelections = Object.entries(selections)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([name, value]) => [name.toLowerCase(), value] as const);
  const matches = (variant: ProductVariant) => normalizedSelections.every(([name, value]) =>
    variant.options.some((option) => option.name.toLowerCase() === name && option.label === value),
  );

  return variants.find((variant) => matches(variant) && variant.available) ?? variants.find(matches) ?? null;
}
