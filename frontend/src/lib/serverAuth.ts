// Server-enforced admin auth. Login checks credentials from server-only env
// vars and issues an HMAC-signed, httpOnly session cookie. Admin API routes
// verify that cookie before doing anything.

import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE = "pl_admin";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days (seconds)

// Server-only (NOT NEXT_PUBLIC) — never shipped to the browser.
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@example.com")
  .trim()
  .toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme";

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
