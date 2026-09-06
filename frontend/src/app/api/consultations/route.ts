import { NextRequest, NextResponse, after } from "next/server";
import {
  createConsultation,
  listConsultations,
  validateConsultation,
  ConsultationValidationError,
} from "@/lib/consultations";
import { isAdminRequest } from "@/lib/serverAuth";
import { notifyNewConsultation } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: a shopper asks for a skincare consultation from the home screen.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    const input = validateConsultation(body);
    const consultation = await createConsultation(input);
    // After the response, like a new order: the request is already saved, so
    // nobody waits on Telegram to be told it went through.
    after(() => notifyNewConsultation(consultation));
    return NextResponse.json(consultation, { status: 201 });
  } catch (err) {
    if (err instanceof ConsultationValidationError)
      return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("Create consultation failed:", err);
    return NextResponse.json(
      { error: "Could not send the request. Please try again." },
      { status: 500 },
    );
  }
}

// Admin only: every request, newest first.
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await listConsultations());
  } catch (err) {
    console.error("List consultations failed:", err);
    return NextResponse.json(
      { error: "Could not load the consultation requests." },
      { status: 500 },
    );
  }
}
