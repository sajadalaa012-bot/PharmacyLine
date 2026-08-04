"use client";

import { useEffect, useState } from "react";
import { isAuthed, login } from "@/lib/auth";
import { useI18n } from "@/lib/LanguageProvider";
import LanguageToggle from "./LanguageToggle";

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
  const { t } = useI18n();
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
      setError(err instanceof Error ? err.message : t("auth.failed"));
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-2xl font-semibold tracking-tight">
              {t("common.brand")}
            </p>
            <p className="mt-1 text-sm text-ink-3">{t("auth.title")}</p>
          </div>
          {/* Reachable before signing in — the gate is the first screen staff meet. */}
          <LanguageToggle />
        </div>

        <label className="mt-6 block text-sm font-medium text-ink-2">
          {t("auth.email")}
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          autoComplete="username"
          dir="ltr"
          className={inputClass}
          placeholder={t("auth.emailPlaceholder")}
        />

        <label className="mt-4 block text-sm font-medium text-ink-2">
          {t("auth.password")}
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          dir="ltr"
          className={inputClass}
          placeholder={t("auth.passwordPlaceholder")}
        />

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy || !email || !password}
          className="mt-5 w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {busy ? t("auth.signingIn") : t("auth.signIn")}
        </button>
      </form>
    </div>
  );
}
