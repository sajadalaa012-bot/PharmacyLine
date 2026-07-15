import { NextRequest, NextResponse } from "next/server";
import {
  listPharmacies,
  createPharmacy,
  validatePharmacyInput,
  PharmacyValidationError,
} from "@/lib/pharmacies";
import { isAdminRequest } from "@/lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// Admin only: the full pharmacy directory.
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized();
  try {
    return NextResponse.json(await listPharmacies());
  } catch (err) {
    console.error("List pharmacies failed:", err);
    return NextResponse.json(
      { error: "Could not load pharmacies." },
      { status: 500 },
    );
  }
}

// Admin only: add a pharmacy.
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized();
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    const input = validatePharmacyInput(body);
    const pharmacy = await createPharmacy(input);
    return NextResponse.json(pharmacy, { status: 201 });
  } catch (err) {
    if (err instanceof PharmacyValidationError)
      return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("Create pharmacy failed:", err);
    return NextResponse.json(
      { error: "Could not save the pharmacy." },
      { status: 500 },
    );
  }
}
