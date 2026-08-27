import { NextRequest, NextResponse } from "next/server";
import { createProduct, validateProduct, CatalogError } from "@/lib/catalog";
import { isAdminRequest } from "@/lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin only: add a product.
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = validateProduct(await req.json().catch(() => null));
    return NextResponse.json(await createProduct(input), { status: 201 });
  } catch (err) {
    if (err instanceof CatalogError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Create product failed:", err);
    return NextResponse.json(
      { error: "Could not save the product." },
      { status: 500 },
    );
  }
}
