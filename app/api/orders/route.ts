import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { orderInputSchema } from "@/lib/schemas";

function generateReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "";
  for (let i = 0; i < 6; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `KOI-${ref}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    try {
      orderInputSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.issues.map((issue) => issue.message);
        return NextResponse.json(
          { success: false, error: messages[0] },
          { status: 400 },
        );
      }
      throw error;
    }

    // TODO: replace with InsForge insert once DB is set up (Phase 1 · 03)
    const reference = generateReference();

    return NextResponse.json({ success: true, data: { reference } });
  } catch (error) {
    console.error("[api/orders]", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
