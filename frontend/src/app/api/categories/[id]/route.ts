import { NextRequest, NextResponse } from "next/server";
import {
  updateCategory,
  deleteCategory,
  validateCategory,
  CatalogError,
} from "@/lib/catalog";
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
  NextResponse.json({ error: "Invalid category id." }, { status: 400 });

// Admin only: rename / reorder a category.
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(req)) return unauthorized();
  const id = parseId((await ctx.params).id);
  if (id === null) return badId();
  try {
    const input = validateCategory(await req.json().catch(() => null));
    const category = await updateCategory(id, input);
    if (!category)
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    return NextResponse.json(category);
  } catch (err) {
    if (err instanceof CatalogError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Update category failed:", err);
    return NextResponse.json(
      { error: "Could not save the category." },
      { status: 500 },
    );
  }
}

// Admin only. Refused while the category still holds products.
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(req)) return unauthorized();
  const id = parseId((await ctx.params).id);
  if (id === null) return badId();
  try {
    const ok = await deleteCategory(id);
    if (!ok)
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof CatalogError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Delete category failed:", err);
    return NextResponse.json(
      { error: "Could not delete the category." },
      { status: 500 },
    );
  }
}
