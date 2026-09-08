"use client";

/**
 * Where phone notifications are switched on.
 *
 * Two steps, in the order they have to happen. The shop needs a key pair
 * before any device can listen, so that comes first and can be made here
 * rather than at a terminal. Then each device that should be alerted turns
 * itself on, because a subscription belongs to a browser and cannot be
 * arranged for someone else's phone from this one.
 */

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Send,
  Trash2,
} from "lucide-react";
import { useI18n } from "@/lib/LanguageProvider";
import {
  currentSubscription,
  pushBlocked,
  pushSupported,
  subscribe,
  unsubscribe,
} from "@/lib/pushClient";

interface Status {
  configured: boolean;
  fromEnv: boolean;
  publicKey: string | null;
  devices: number;
}

export default function NotificationsPage() {
  const { t } = useI18n();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [blocked, setBlocked] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/push", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load.");
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // What this browser can do, and whether it is already listening. Both are
    // browser-only facts, so neither can be read before mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(pushSupported());
    setBlocked(pushBlocked());
    currentSubscription().then((sub) => setEndpoint(sub?.endpoint ?? null));
  }, []);

  /** One server action, with the page's error and notice lines wired in. */
  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(action);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The action failed.");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const turnOnHere = async () => {
    setBusy("device");
    setError(null);
    setNotice(null);
    const outcome = await subscribe("admin");
    setBusy(null);
    if (outcome === "subscribed") {
      const sub = await currentSubscription();
      setEndpoint(sub?.endpoint ?? null);
      await load();
      return;
    }
    if (outcome === "blocked") {
      setBlocked(true);
      setError(t("push.blocked"));
      return;
    }
    setError(
      outcome === "unconfigured" ? t("push.keysNeeded") : t("notify.failed"),
    );
  };

  const turnOffHere = async () => {
    setBusy("device");
    await unsubscribe();
    setEndpoint(null);
    setBusy(null);
    await load();
  };

  const card = "rounded-lg border border-line bg-surface p-5";
  const btn =
    "label-caps flex h-10 items-center justify-center gap-2 rounded-md px-4 transition disabled:opacity-50";

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-ink-3">
        <LoaderCircle className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const configured = !!status?.configured;
  const listening = !!endpoint;
  const devices = status?.devices ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6 sm:py-7">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          {t("push.title")}
        </h1>
        <p className="mt-1 text-sm text-ink-2">{t("push.subtitle")}</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-rose/30 bg-rose/10 p-3 text-xs text-rose">
          <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="flex items-start gap-2 rounded-md border border-brand/30 bg-brand/10 p-3 text-xs text-brand">
          <CheckCircle2 className="mt-px h-4 w-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* ── 1. The service ── */}
      <section className={card}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold text-ink">
            {t("push.step1")}
          </h2>
          <span
            className={`label-caps rounded-full px-2 py-1 text-[10px] ${
              configured ? "bg-brand/10 text-brand" : "bg-copper/10 text-copper"
            }`}
          >
            {configured ? t("push.on") : t("push.off")}
          </span>
        </div>

        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
          {configured ? t("push.keysReady") : t("push.keysMissing")}
        </p>

        {status?.fromEnv ? (
          <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
            {t("push.fromEnv")}
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {!configured && (
              <button
                type="button"
                disabled={busy === "generate"}
                onClick={async () => {
                  if (await act("generate")) await load();
                }}
                className={`${btn} bg-brand text-on-brand hover:bg-brand-deep`}
              >
                {busy === "generate" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                {t("push.generate")}
              </button>
            )}
            {configured && (
              <button
                type="button"
                disabled={busy === "clear"}
                onClick={async () => {
                  if (await act("clear")) {
                    setEndpoint(null);
                    await load();
                  }
                }}
                className={`${btn} border border-rose/40 text-rose hover:bg-rose/10`}
              >
                <Trash2 className="h-4 w-4" />
                {t("push.clearKeys")}
              </button>
            )}
          </div>
        )}

        {configured && !status?.fromEnv && (
          <p className="mt-2 text-[11px] leading-relaxed text-ink-3">
            {t("push.clearWarn")}
          </p>
        )}
      </section>

      {/* ── 2. This device ── */}
      <section className={card}>
        <h2 className="font-display text-base font-semibold text-ink">
          {t("push.step2")}
        </h2>

        <div className="mt-3 flex items-center gap-3 rounded-md border border-line bg-sunken/50 p-3.5">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              listening ? "bg-brand/12 text-brand" : "bg-surface text-ink-3"
            }`}
          >
            {listening ? (
              <BellRing className="h-5 w-5" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-ink">
              {listening ? t("push.deviceOn") : t("push.deviceOff")}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-ink-3">
              {devices === 0
                ? t("push.listeningNone")
                : devices === 1
                  ? t("push.listeningOne")
                  : t("push.listening", { n: devices })}
            </p>
          </div>
        </div>

        {!supported ? (
          <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
            {t("push.unsupported")}
          </p>
        ) : blocked && !listening ? (
          <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
            {t("push.blocked")}
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {listening ? (
              <>
                <button
                  type="button"
                  disabled={busy === "test"}
                  onClick={async () => {
                    if (await act("test", { endpoint }))
                      setNotice(t("push.testSent"));
                  }}
                  className={`${btn} border border-brand/40 bg-brand/10 text-brand hover:bg-brand/20`}
                >
                  {busy === "test" ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {t("push.test")}
                </button>
                <button
                  type="button"
                  disabled={busy === "device"}
                  onClick={turnOffHere}
                  className={`${btn} border border-line text-ink-2 hover:bg-sunken`}
                >
                  {t("push.turnOff")}
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={busy === "device" || !configured}
                onClick={turnOnHere}
                className={`${btn} bg-brand text-on-brand hover:bg-brand-deep`}
              >
                {busy === "device" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                {t("push.turnOn")}
              </button>
            )}
          </div>
        )}

        {!configured && supported && (
          <p className="mt-2 text-[11px] leading-relaxed text-ink-3">
            {t("push.keysNeeded")}
          </p>
        )}
      </section>
    </div>
  );
}
