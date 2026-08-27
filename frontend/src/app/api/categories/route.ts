import { NextRequest, NextResponse } from "next/server";
import { createCategory, validateCategory, CatalogError } from "@/lib/catalog";
import { isAdminRequest } from "@/lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin only: add a category.
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = validateCategory(await req.json().catch(() => null));
    return NextResponse.json(await createCategory(input), { status: 201 });
  } catch (err) {
    if (err instanceof CatalogError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Create category failed:", err);
    return NextResponse.json(
      { error: "Could not save the category." },
      { status: 500 },
    );
  }
}
