import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { NikePriorityRefreshRepository } from "@/database/repositories/nikePriorityRefreshRepository";
import { ingestNikeDataset } from "@/lib/catalog-ingestion";
import { completeNikeProductRefresh } from "@/lib/nike-refresh-completion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  eventType: z.enum([
    "ACTOR.RUN.SUCCEEDED",
    "ACTOR.RUN.FAILED",
    "ACTOR.RUN.TIMED_OUT",
    "ACTOR.RUN.ABORTED",
  ]),
  resource: z.object({
    id: z.string().min(1),
    actId: z.string().min(1),
    defaultDatasetId: z.string().min(1),
    status: z.string().min(1),
  }),
});

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

  const parsed = payloadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid Apify webhook payload." }, { status: 400 });
  }

  const refreshes = new NikePriorityRefreshRepository(db);
  try {
    const result = await completeNikeProductRefresh(parsed.data, {
      store: refreshes,
      ingest: ingestNikeDataset,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[api/catalog/refresh/nike/callback]", error);
    return NextResponse.json({ success: false, error: "Nike product refresh ingestion failed." }, { status: 500 });
  }
}
