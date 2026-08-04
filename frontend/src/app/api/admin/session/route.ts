import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, USING_DEFAULT_CREDENTIALS } from "@/lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return NextResponse.json({
    authenticated: isAdminRequest(req),
    // Whether the built-in fallback credentials are in force. A warning flag
    // only — never the credentials themselves.
    defaultCredentials: USING_DEFAULT_CREDENTIALS,
  });
}
