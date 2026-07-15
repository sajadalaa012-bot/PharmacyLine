import { NextRequest, NextResponse } from "next/server";
import {
  updatePharmacy,
  deletePharmacy,
  validatePharmacyInput,
  PharmacyValidationError,
} from "@/lib/pharmacies";
import { isAdminRequest } from "@/lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseId(id: string): number | null {
  const n = parseInt(id, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}
const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(req)) return unauthorized();
  const id = parseId((await ctx.params).id);
  if (id === null)
    return NextResponse.json({ error: "Invalid pharmacy id." }, { status: 400 });
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    const input = validatePharmacyInput(body);
    const pharmacy = await updatePharmacy(id, input);
    if (!pharmacy)
      return NextResponse.json(
        { error: "Pharmacy not found." },
        { status: 404 },
      );
    return NextResponse.json(pharmacy);
  } catch (err) {
    if (err instanceof PharmacyValidationError)
      return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("Update pharmacy failed:", err);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(req)) return unauthorized();
  const id = parseId((await ctx.params).id);
  if (id === null)
    return NextResponse.json({ error: "Invalid pharmacy id." }, { status: 400 });
  const ok = await deletePharmacy(id);
  if (!ok)
    return NextResponse.json({ error: "Pharmacy not found." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
