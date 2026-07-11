// Client-side auth: stores the bearer token from /api/login in localStorage
// and exposes helpers used by the API layer and the login gate.

const TOKEN_KEY = "pos_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthed(): boolean {
  return !!getToken();
}

/** Exchange a password for a token. Throws on wrong password. */
export async function login(password: string): Promise<void> {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Login failed.");
  }
  const data = await res.json();
  setToken(data.token);
}

/** Log out and return to the login screen. */
export function logout(): void {
  clearToken();
  if (typeof window !== "undefined") window.location.reload();
}
