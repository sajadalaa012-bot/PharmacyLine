import { NextRequest, NextResponse } from "next/server";
import { DeckError, getHomeDeck, saveHomeDeck } from "@/lib/homeDeck";
import { isAdminRequest } from "@/lib/serverAuth";
import { DEFAULT_DECK } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: the storefront reads this with the catalogue on every load.
export async function GET() {
  try {
    return NextResponse.json(await getHomeDeck());
  } catch (err) {
    // The deck is decoration around a shop that still works without it, so a
    // failure here answers with the built-in copy rather than an error the
    // storefront would have to handle.
    console.error("Load home deck failed:", err);
    return NextResponse.json(DEFAULT_DECK);
  }
}

// Admin only: replace it. The editor always sends the whole record, and
// saveHomeDeck validates every field, so there is nothing to merge.
export async function PUT(req: NextRequest) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    return NextResponse.json(await saveHomeDeck(body));
  } catch (err) {
    if (err instanceof DeckError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Save home deck failed:", err);
    return NextResponse.json(
      { error: "Could not save the home slides." },
      { status: 500 },
    );
  }
}
