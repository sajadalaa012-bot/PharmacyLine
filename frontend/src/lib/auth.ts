// Client-side admin gate for the browser-only app. Since there is no server,
// this is a soft UI lock (the credentials live in the built JS). It keeps the
// admin screens out of casual reach — it is not server-enforced security.
//
// Credentials come from build-time env vars, with dev-friendly fallbacks:
//   NEXT_PUBLIC_ADMIN_EMAIL, NEXT_PUBLIC_ADMIN_PASSWORD

const TOKEN_KEY = "pos_admin";

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@example.com")
  .trim()
  .toLowerCase();
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "changeme";

export function isAuthed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(TOKEN_KEY) === "1";
}

/** Validate admin email + password locally. Throws on mismatch. */
export async function login(email: string, password: string): Promise<void> {
  const ok =
    email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD;
  if (!ok) throw new Error("Incorrect email or password.");
  localStorage.setItem(TOKEN_KEY, "1");
}

/** Sign out and return to the login screen. */
export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  if (typeof window !== "undefined") window.location.reload();
}
