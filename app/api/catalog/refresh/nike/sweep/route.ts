import { NextRequest, NextResponse } from "next/server";
import { nikePostgresReadsEnabled } from "@/lib/catalog-feature-flags";
import { isAuthorizedNikeRefreshSweep } from "@/lib/nike-proactive-refresh";
import { runConfiguredNikeProactiveRefreshSweep } from "@/lib/nike-proactive-refresh-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isAuthorizedNikeRefreshSweep(request.headers.get("authorization"))) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!nikePostgresReadsEnabled()) {
    return NextResponse.json({ success: true, skipped: true, reason: "Nike PostgreSQL reads are disabled." });
  }

  try {
    const result = await runConfiguredNikeProactiveRefreshSweep();
    return NextResponse.json({ success: true, skipped: false, data: result });
  } catch (error) {
    console.error("[api/catalog/refresh/nike/sweep]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Nike refresh sweep failed." },
      { status: 500 },
    );
  }
}
