import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ingestNikeDataset } from "@/lib/catalog-ingestion";
import { resolveLatestSuccessfulNikeRun } from "@/lib/apify-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CATALOG_INGESTION_SECRET;
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !received) return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const actorId = process.env.APIFY_NIKE_ACTOR_ID;
  if (!actorId) {
    return NextResponse.json({ success: false, error: "Nike Apify Actor is not configured." }, { status: 503 });
  }

  try {
    const run = await resolveLatestSuccessfulNikeRun(actorId);
    const result = await ingestNikeDataset(run.datasetId, { actorId: run.actorId, runId: run.runId });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[api/catalog/sync/nike]", error);
    return NextResponse.json({ success: false, error: "Nike catalogue ingestion failed." }, { status: 500 });
  }
}
