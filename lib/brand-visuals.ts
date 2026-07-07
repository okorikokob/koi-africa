// Colourful gradient fallbacks for brand tiles that don't have a synced
// product image yet — avoids the flat grey placeholder look.
const GRADIENTS = [
  "linear-gradient(135deg, #004aad 0%, #2f7bd6 100%)",
  "linear-gradient(135deg, #7c2d92 0%, #c2418a 100%)",
  "linear-gradient(135deg, #b8860b 0%, #e8b923 100%)",
  "linear-gradient(135deg, #0f766e 0%, #34d399 100%)",
  "linear-gradient(135deg, #9d174d 0%, #f472b6 100%)",
  "linear-gradient(135deg, #1e293b 0%, #475569 100%)",
];

export function brandGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

// Curated brand images — used in place of the live-synced product photo for
// brands where the catalog photo doesn't read well in a tile (grey studio
// background, awkward crop). Keyed by brand slug.
const BRAND_IMAGE_OVERRIDES: Record<string, string> = {
  nike: "/assets/nike.webp",
  adidas: "/assets/addidas.webp",
};

export function brandImageOverride(slug: string): string | null {
  return BRAND_IMAGE_OVERRIDES[slug] ?? null;
}
