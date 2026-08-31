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

const startedActorRunSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    actId: z.string().min(1),
    defaultDatasetId: z.string().min(1),
  }),
});

const completedActorRunSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    actId: z.string().min(1),
    defaultDatasetId: z.string().min(1),
    status: z.enum(["READY", "RUNNING", "SUCCEEDED", "FAILED", "TIMING-OUT", "TIMED-OUT", "ABORTING", "ABORTED"]),
  }),
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

export async function startNikeProductRefresh(input: {
  actorId: string;
  sourceProductId?: string;
  canonicalUrl?: string;
  callbackUrl?: string;
  callbackSecret?: string;
}): Promise<{ runId: string }> {
  const webhook = {
    eventTypes: ["ACTOR.RUN.SUCCEEDED", "ACTOR.RUN.FAILED", "ACTOR.RUN.TIMED_OUT", "ACTOR.RUN.ABORTED"],
    requestUrl: input.callbackUrl,
    payloadTemplate: JSON.stringify({
      eventType: "{{eventType}}",
      resource: {
        id: "{{resource.id}}",
        actId: "{{resource.actId}}",
        defaultDatasetId: "{{resource.defaultDatasetId}}",
        status: "{{resource.status}}",
      },
    }),
    headersTemplate: JSON.stringify({ Authorization: `Bearer ${input.callbackSecret}` }),
    shouldInterpolateStrings: true,
  };
  const url = new URL(`${APIFY_API_BASE_URL}/acts/${encodeURIComponent(input.actorId)}/runs`);
  // The KOI-owned actor needs access to KOI's private trusted Nike dataset when
  // resolving a stable sourceProductId into the latest official PDP URL.
  url.searchParams.set("forcePermissionLevel", "FULL_PERMISSIONS");
  if (input.callbackUrl && input.callbackSecret) {
    url.searchParams.set("webhooks", Buffer.from(JSON.stringify([webhook])).toString("base64"));
  }
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApifyToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      operation: "product-refresh",
      storefront: "nike-us",
      ...(input.sourceProductId
        ? { sourceProductId: input.sourceProductId }
        : { productUrl: input.canonicalUrl }),
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 1000);
    throw new Error(`Apify product refresh failed to start with ${response.status}: ${detail}`);
  }
  const run = startedActorRunSchema.parse(await response.json()).data;
  return { runId: run.id };
}

export async function waitForApifyRun(
  runId: string,
  options: { timeoutMs?: number; pollIntervalMs?: number } = {},
): Promise<{ runId: string; actorId: string; datasetId: string; status: "SUCCEEDED" | "FAILED" | "TIMED-OUT" | "ABORTED" }> {
  const timeoutMs = options.timeoutMs ?? 10 * 60_000;
  const pollIntervalMs = options.pollIntervalMs ?? 2_000;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const url = new URL(`${APIFY_API_BASE_URL}/actor-runs/${encodeURIComponent(runId)}`);
    const run = completedActorRunSchema.parse(await getApifyJson(url)).data;
    if (["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"].includes(run.status)) {
      return {
        runId: run.id,
        actorId: run.actId,
        datasetId: run.defaultDatasetId,
        status: run.status as "SUCCEEDED" | "FAILED" | "TIMED-OUT" | "ABORTED",
      };
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  throw new Error(`Apify product refresh ${runId} did not finish within ${timeoutMs}ms.`);
}
