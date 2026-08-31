import { brightDataNikeRecordSchema, type BrightDataNikeRecord } from "@/lib/brightdata-nike-schema";
import { ConnectorRevalidationError } from "@/lib/connectors/types";

const BRIGHT_DATA_SCRAPE_URL = "https://api.brightdata.com/datasets/v3/scrape";
const REQUEST_TIMEOUT_MS = 45_000;

export type NikeOfficialSourceRequest = {
  canonicalUrl: string;
  sourceProductId: string;
  sourceVariantId: string;
};

export interface NikeOfficialSourceClient {
  fetchVariant(request: NikeOfficialSourceRequest): Promise<BrightDataNikeRecord>;
}

function configuration(): { apiToken: string; datasetId: string } {
  const apiToken = process.env.BRIGHTDATA_API_TOKEN;
  const datasetId = process.env.BRIGHTDATA_NIKE_DATASET_ID;
  if (!apiToken || !datasetId) {
    throw new ConnectorRevalidationError(
      "configuration_unavailable",
      "Live Nike availability verification is not configured. Please try again later.",
    );
  }
  return { apiToken, datasetId };
}

function recordsFrom(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && "data" in payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  throw new ConnectorRevalidationError(
    "source_unavailable",
    "Nike returned an unexpected verification response. Please try again later.",
  );
}

export class BrightDataNikeOfficialSourceClient implements NikeOfficialSourceClient {
  async fetchVariant(request: NikeOfficialSourceRequest): Promise<BrightDataNikeRecord> {
    const { apiToken, datasetId } = configuration();
    const endpoint = new URL(BRIGHT_DATA_SCRAPE_URL);
    endpoint.searchParams.set("dataset_id", datasetId);
    endpoint.searchParams.set("format", "json");

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([{ url: request.canonicalUrl }]),
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ConnectorRevalidationError(
        "source_unavailable",
        "Nike availability could not be verified. Please try again later.",
      );
    }

    if (!response.ok) {
      throw new ConnectorRevalidationError(
        "source_unavailable",
        "Nike availability could not be verified. Please try again later.",
      );
    }

    const records = recordsFrom(await response.json());
    for (const raw of records) {
      const parsed = brightDataNikeRecordSchema.safeParse(raw);
      if (!parsed.success) continue;
      if (
        parsed.data.group_id === request.sourceProductId
        && parsed.data.variant_id === request.sourceVariantId
      ) {
        return parsed.data;
      }
    }

    throw new ConnectorRevalidationError(
      "variant_identity_mismatch",
      "The selected Nike variant could not be verified. Please select it again.",
    );
  }
}
