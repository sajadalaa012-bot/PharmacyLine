import { NextResponse } from "next/server";
import { listCatalog } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: the whole shop — categories in display order, each with its
// products. Every storefront and admin screen loads from here, so an edit
// made in the admin is live for everyone on their next load.
export async function GET() {
  try {
    return NextResponse.json(await listCatalog());
  } catch (err) {
    console.error("Load catalog failed:", err);
    return NextResponse.json(
      { error: "Could not load the catalog." },
      { status: 500 },
    );
  }
}
