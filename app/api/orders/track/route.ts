import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { trackOrderSchema } from "@/lib/schemas";
import { customerOrderRepository } from "@/database/repositories/customerOrderRepository";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let input;
    try {
      input = trackOrderSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: error.issues[0].message },
          { status: 400 },
        );
      }
      throw error;
    }

    const order = await customerOrderRepository.track(input.reference, input.email);

    if (!order) {
      return NextResponse.json(
        { success: false, error: "No order found for that reference and email." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: true, data: order },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("[api/orders/track]", error instanceof Error
      ? { name: error.name, message: error.message }
      : { type: typeof error });
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
