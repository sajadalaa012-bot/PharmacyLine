import { NextRequest, NextResponse } from "next/server";
import {
  updatePackage,
  deletePackage,
  validatePackage,
  PackageError,
} from "@/lib/packages";
import { isAdminRequest } from "@/lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseId(id: string): number | null {
  const n = parseInt(id, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}
const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const badId = () =>
  NextResponse.json({ error: "Invalid package id." }, { status: 400 });
const notFound = () =>
  NextResponse.json({ error: "Package not found." }, { status: 404 });

// A full replacement, like a product update: the editor always sends every
// field, so there is nothing to merge.
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(req)) return unauthorized();
  const id = parseId((await ctx.params).id);
  if (id === null) return badId();
  try {
    const input = validatePackage(await req.json().catch(() => null));
    const updated = await updatePackage(id, input);
    return updated ? NextResponse.json(updated) : notFound();
  } catch (err) {
    if (err instanceof PackageError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Update package failed:", err);
    return NextResponse.json(
      { error: "Could not save the package." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(req)) return unauthorized();
  const id = parseId((await ctx.params).id);
  if (id === null) return badId();
  try {
    const ok = await deletePackage(id);
    return ok ? new NextResponse(null, { status: 204 }) : notFound();
  } catch (err) {
    console.error("Delete package failed:", err);
    return NextResponse.json(
      { error: "Could not delete the package." },
      { status: 500 },
    );
  }
}
