import { NextRequest, NextResponse } from "next/server";
import {
  verifyCredentials,
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  sessionCookieOptions,
} from "@/lib/serverAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!verifyCredentials(email, password)) {
    return NextResponse.json(
      { error: "Incorrect email or password." },
      { status: 401 },
    );
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(
    SESSION_COOKIE,
    createSessionToken(),
    sessionCookieOptions(SESSION_MAX_AGE),
  );
  return res;
}
