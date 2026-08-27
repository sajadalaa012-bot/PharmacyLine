import { NextRequest, NextResponse } from "next/server";
import {
  updateProduct,
  deleteProduct,
  validateProduct,
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
  NextResponse.json({ error: "Invalid product id." }, { status: 400 });

// Admin only: replace a product. The form sends every field.
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(req)) return unauthorized();
  const id = parseId((await ctx.params).id);
  if (id === null) return badId();
  try {
    const input = validateProduct(await req.json().catch(() => null));
    const product = await updateProduct(id, input);
    if (!product)
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    return NextResponse.json(product);
  } catch (err) {
    if (err instanceof CatalogError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Update product failed:", err);
    return NextResponse.json(
      { error: "Could not save the product." },
      { status: 500 },
    );
  }
}

// Admin only.
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(req)) return unauthorized();
  const id = parseId((await ctx.params).id);
  if (id === null) return badId();
  try {
    const ok = await deleteProduct(id);
    if (!ok)
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("Delete product failed:", err);
    return NextResponse.json(
      { error: "Could not delete the product." },
      { status: 500 },
    );
  }
}
