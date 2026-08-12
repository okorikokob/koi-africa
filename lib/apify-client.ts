const APIFY_DATASET_BASE_URL = "https://api.apify.com/v2/datasets";

export async function getApifyDatasetItems(datasetId: string): Promise<unknown[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN is not configured.");

  const url = new URL(`${APIFY_DATASET_BASE_URL}/${encodeURIComponent(datasetId)}/items`);
  url.searchParams.set("clean", "true");
  url.searchParams.set("format", "json");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Apify Dataset request failed with ${response.status}.`);

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error("Apify Dataset response was not an array.");
  return payload;
}
