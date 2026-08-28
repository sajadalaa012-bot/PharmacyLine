import { NextRequest, NextResponse } from "next/server";
import {
  listProductCategories,
  createProductCategory,
  validateCategory,
  CatalogError,
} from "@/lib/catalog";
import { isAdminRequest } from "@/lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Product types — Serum, Cleanser, Sunscreen. Not to be confused with
// /api/categories, which is the shop's brands. See lib/catalog.ts.

// Public: the storefront's category filter reads this on every load.
export async function GET() {
  try {
    return NextResponse.json(await listProductCategories());
  } catch (err) {
    console.error("List product categories failed:", err);
    return NextResponse.json(
      { error: "Could not load the categories." },
      { status: 500 },
    );
  }
}

// Admin only: add a category.
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = validateCategory(await req.json().catch(() => null));
    return NextResponse.json(await createProductCategory(input), { status: 201 });
  } catch (err) {
    if (err instanceof CatalogError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Create product category failed:", err);
    return NextResponse.json(
      { error: "Could not save the category." },
      { status: 500 },
    );
  }
}
