// Client helpers for the server-enforced admin session. The actual check and
// credentials live on the server (see lib/serverAuth.ts + /api/admin/*); the
// browser only holds an httpOnly cookie it can't read, so auth is real.

export async function isAuthed(): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/session", { cache: "no-store" });
    if (!res.ok) return false;
    const data = await res.json();
    return data.authenticated === true;
  } catch {
    return false;
  }
}

/** Sign in with admin email + password. Throws on bad credentials. */
export async function login(email: string, password: string): Promise<void> {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Login failed.");
  }
}

/** Sign out and return to the login screen. */
export async function logout(): Promise<void> {
  await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
  if (typeof window !== "undefined") window.location.reload();
}
