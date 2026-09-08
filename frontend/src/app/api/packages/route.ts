import { NextRequest, NextResponse } from "next/server";
import {
  listPackages,
  createPackage,
  validatePackage,
  PackageError,
} from "@/lib/packages";
import { isAdminRequest } from "@/lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The storefront reads this on every load and must only ever see packages
// that are switched on. The admin asks for all of them with ?all=1, and only
// gets them with a session — a hidden package is a price that isn't public
// yet, so the flag is authorised rather than trusted.
export async function GET(req: NextRequest) {
  const wantsAll = req.nextUrl.searchParams.get("all") === "1";
  const all = wantsAll && isAdminRequest(req);
  try {
    return NextResponse.json(await listPackages(!all));
  } catch (err) {
    console.error("List packages failed:", err);
    return NextResponse.json(
      { error: "Could not load the packages." },
      { status: 500 },
    );
  }
}

// Admin only: add a package.
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = validatePackage(await req.json().catch(() => null));
    return NextResponse.json(await createPackage(input), { status: 201 });
  } catch (err) {
    if (err instanceof PackageError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Create package failed:", err);
    return NextResponse.json(
      { error: "Could not save the package." },
      { status: 500 },
    );
  }
}
