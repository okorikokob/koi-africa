import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ingestNikeDataset } from "@/lib/catalog-ingestion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIXED_NIKE_PROOF_DATASET_ID = "2ZKvnlUeD0VImDgKO";

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

  const datasetId = process.env.NIKE_APIFY_DATASET_ID;
  if (datasetId !== FIXED_NIKE_PROOF_DATASET_ID) {
    return NextResponse.json({ success: false, error: "Nike proof Dataset is not configured." }, { status: 503 });
  }

  try {
    const result = await ingestNikeDataset(datasetId);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[api/catalog/sync/nike]", error);
    return NextResponse.json({ success: false, error: "Nike catalogue ingestion failed." }, { status: 500 });
  }
}
