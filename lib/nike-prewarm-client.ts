export type NikePrewarmProduct = {
  id: string;
  brandName: string;
};

export function isNikePrewarmProduct(product: NikePrewarmProduct): boolean {
  return product.brandName.trim().toLowerCase() === "nike";
}

export async function requestNikeProductPrewarm(
  product: NikePrewarmProduct,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  if (!isNikePrewarmProduct(product)) return false;

  const response = await fetcher("/api/catalog/refresh/nike/prewarm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId: product.id }),
    keepalive: true,
  });
  return response.ok;
}
