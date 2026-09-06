import { NextRequest, NextResponse } from "next/server";
import {
  setConsultationStatus,
  deleteConsultation,
} from "@/lib/consultations";
import { isAdminRequest } from "@/lib/serverAuth";
import { ConsultationStatus } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseId(id: string): number | null {
  const n = parseInt(id, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}
const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const badId = () =>
  NextResponse.json({ error: "Invalid consultation id." }, { status: 400 });
const notFound = () =>
  NextResponse.json({ error: "Consultation not found." }, { status: 404 });

// The only thing an admin edits: whether it has been dealt with. The request
// itself is what the shopper wrote, and stays as they wrote it.
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(req)) return unauthorized();
  const id = parseId((await ctx.params).id);
  if (id === null) return badId();

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const status: ConsultationStatus = body?.status === "done" ? "done" : "new";
  const updated = await setConsultationStatus(id, status);
  return updated ? NextResponse.json(updated) : notFound();
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(req)) return unauthorized();
  const id = parseId((await ctx.params).id);
  if (id === null) return badId();
  const ok = await deleteConsultation(id);
  return ok ? new NextResponse(null, { status: 204 }) : notFound();
}
