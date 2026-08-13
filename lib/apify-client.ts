import { z } from "zod";

const APIFY_DATASET_BASE_URL = "https://api.apify.com/v2/datasets";
const APIFY_API_BASE_URL = "https://api.apify.com/v2";

const actorRunSchema = z.object({
  id: z.string().min(1),
  actId: z.string().min(1),
  status: z.literal("SUCCEEDED"),
  defaultDatasetId: z.string().min(1),
  defaultKeyValueStoreId: z.string().min(1),
});

const actorRunsResponseSchema = z.object({
  data: z.object({ items: z.array(actorRunSchema) }),
});

const nikeRunInputSchema = z.object({
  storefront: z.literal("nike-us"),
});

export type ApifyNikeRun = {
  runId: string;
  actorId: string;
  datasetId: string;
};

function getApifyToken(): string {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN is not configured.");
  return token;
}

async function getApifyJson(url: URL): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${getApifyToken()}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Apify request failed with ${response.status}.`);
  return response.json();
}

export async function resolveLatestSuccessfulNikeRun(actorId: string): Promise<ApifyNikeRun> {
  const runsUrl = new URL(`${APIFY_API_BASE_URL}/acts/${encodeURIComponent(actorId)}/runs`);
  runsUrl.searchParams.set("status", "SUCCEEDED");
  runsUrl.searchParams.set("desc", "true");
  runsUrl.searchParams.set("limit", "100");

  const runs = actorRunsResponseSchema.parse(await getApifyJson(runsUrl)).data.items;
  for (const run of runs) {
    if (run.actId !== actorId || run.status !== "SUCCEEDED") continue;

    const inputUrl = new URL(
      `${APIFY_API_BASE_URL}/key-value-stores/${encodeURIComponent(run.defaultKeyValueStoreId)}/records/INPUT`,
    );
    const input = nikeRunInputSchema.safeParse(await getApifyJson(inputUrl));
    if (!input.success) continue;

    return { runId: run.id, actorId: run.actId, datasetId: run.defaultDatasetId };
  }

  throw new Error("No successful nike-us run was found for the configured Apify Actor.");
}

export async function getApifyDatasetItems(datasetId: string): Promise<unknown[]> {
  const url = new URL(`${APIFY_DATASET_BASE_URL}/${encodeURIComponent(datasetId)}/items`);
  url.searchParams.set("clean", "true");
  url.searchParams.set("format", "json");

  const payload = await getApifyJson(url);
  if (!Array.isArray(payload)) throw new Error("Apify Dataset response was not an array.");
  return payload;
}
