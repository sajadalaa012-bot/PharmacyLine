// Server-enforced admin auth. Login checks credentials from server-only env
// vars and issues an HMAC-signed, httpOnly session cookie. Admin API routes
// verify that cookie before doing anything.

import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE = "pl_admin";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days (seconds)

// ADMIN_EMAIL / ADMIN_PASSWORD are server-only and are what you should set.
//
// The NEXT_PUBLIC_* names are read as a fallback only because earlier versions
// of this app did client-side auth and told you to configure those; hosts set
// up back then would otherwise silently fall through to the defaults below.
// Prefer the server-only names: anything NEXT_PUBLIC_ is build-time public.
const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL ||
  process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
  "pharmacyline@gmail.com"
)
  .trim()
  .toLowerCase();
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD ||
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD ||
  "pharmacyline";

/**
 * True when no admin credentials were configured at all, so the fallbacks in
 * this file — which are committed to a public repo — are what is guarding the
 * back office. Surfaced on the login screen so it can't go unnoticed.
 */
export const USING_DEFAULT_CREDENTIALS =
  !process.env.ADMIN_EMAIL &&
  !process.env.NEXT_PUBLIC_ADMIN_EMAIL &&
  !process.env.ADMIN_PASSWORD &&
  !process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

function secret(): string {
  return process.env.AUTH_SECRET || ADMIN_PASSWORD || "dev-insecure-secret";
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function verifyCredentials(email: string, password: string): boolean {
  return (
    safeEqual((email || "").trim().toLowerCase(), ADMIN_EMAIL) &&
    safeEqual(password || "", ADMIN_PASSWORD)
  );
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function createSessionToken(): string {
  const payload = {
    sub: "admin",
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  if (!safeEqual(sig, sign(body))) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    return (
      typeof payload.exp === "number" &&
      payload.exp > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

/** True when the request carries a valid admin session cookie. */
export function isAdminRequest(req: NextRequest): boolean {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
}

/** Cookie options shared by login (set) and logout (clear). */
export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
