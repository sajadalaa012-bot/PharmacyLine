"use client";

import { useEffect, useState } from "react";
import { isAuthed, login } from "@/lib/auth";

/**
 * Wraps the admin back office only. The storefront is public; this gate
 * shows an email + password screen until a valid admin token is stored.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let active = true;
    isAuthed().then((ok) => {
      if (active) {
        setAuthed(ok);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Avoid a hydration flash: render nothing until we've read localStorage.
  if (!ready) return null;

  if (!authed) {
    return <LoginScreen onSuccess={() => setAuthed(true)} />;
  }

  return <>{children}</>;
}

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
      setBusy(false);
    }
  }

  const inputClass =
    "mt-1.5 w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-brand";

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 text-ink">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 shadow-sm"
      >
        <p className="font-display text-2xl font-semibold tracking-tight">
          Pharmacy Line
        </p>
        <p className="mt-1 text-sm text-ink-3">Admin sign in</p>

        <label className="mt-6 block text-sm font-medium text-ink-2">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          autoComplete="username"
          className={inputClass}
          placeholder="you@example.com"
        />

        <label className="mt-4 block text-sm font-medium text-ink-2">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className={inputClass}
          placeholder="Enter password"
        />

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy || !email || !password}
          className="mt-5 w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
