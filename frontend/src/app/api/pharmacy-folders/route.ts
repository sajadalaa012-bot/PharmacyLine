import { NextRequest, NextResponse } from "next/server";
import {
  listFolders,
  createFolder,
  PharmacyValidationError,
} from "@/lib/pharmacies";
import { isAdminRequest } from "@/lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// Admin only: all folders.
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized();
  try {
    return NextResponse.json(await listFolders());
  } catch (err) {
    console.error("List folders failed:", err);
    return NextResponse.json(
      { error: "Could not load folders." },
      { status: 500 },
    );
  }
}

// Admin only: create a named folder.
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized();
  try {
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const name = body && typeof body.name === "string" ? body.name : "";
    const folder = await createFolder(name);
    return NextResponse.json(folder, { status: 201 });
  } catch (err) {
    if (err instanceof PharmacyValidationError)
      return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("Create folder failed:", err);
    return NextResponse.json(
      { error: "Could not create the folder." },
      { status: 500 },
    );
  }
}
