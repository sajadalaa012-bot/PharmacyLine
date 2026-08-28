"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Send,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  LoaderCircle,
} from "lucide-react";
import { useI18n } from "@/lib/LanguageProvider";

interface Bot {
  id: number;
  username?: string;
  first_name?: string;
}

interface Status {
  configured: boolean;
  fromEnv: boolean;
  maskedToken?: string;
  chatIds: string[];
  bot: Bot | null;
  error: string | null;
}

interface Chat {
  id: string;
  title: string;
  type: string;
}

/**
 * Where the shop's Telegram connection is set up.
 *
 * The awkward part of connecting a bot is that it cannot start a conversation
 * — somebody has to message it first, and only then does a chat id exist to
 * send to. So the page is built around that: send a message, press Find, pick
 * the chat off a list. Nobody has to know what a chat id is.
 */
export default function TelegramPage() {
  const { t } = useI18n();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [found, setFound] = useState<Chat[] | null>(null);
  const [token, setToken] = useState("");
  const [manualId, setManualId] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/telegram", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("tg.loadFailed"));
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("tg.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Every button on this page is one POST; this is all of them. */
  const act = async (
    action: string,
    payload: Record<string, unknown> = {},
  ): Promise<Record<string, unknown> | null> => {
    setBusy(action);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("tg.actionFailed"));
      // Most actions hand back the whole status, so the page stays in step
      // without a second round trip.
      if (data && typeof data === "object" && "configured" in data) setStatus(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("tg.actionFailed"));
      return null;
    } finally {
      setBusy(null);
    }
  };

  const onDiscover = async () => {
    const data = await act("discover");
    if (!data) return;
    const chats = (data.chats as Chat[]) ?? [];
    setFound(chats);
    if (chats.length === 0) setNotice(t("tg.noneFound"));
  };

  const onTest = async () => {
    const data = await act("test");
    if (!data) return;
    const outcomes = (data.outcomes as { ok: boolean; error?: string }[]) ?? [];
    const failed = outcomes.filter((o) => !o.ok);
    if (failed.length === 0) setNotice(t("tg.testSent"));
    else setError(failed.map((f) => f.error).join(" · "));
  };

  const card =
    "rounded-lg border border-line bg-surface p-5";
  const inputCls =
    "w-full rounded-md border border-line bg-sunken px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-brand/60 focus:ring-1 focus:ring-brand/30";
  const btn =
    "label-caps flex h-10 items-center justify-center gap-2 rounded-md px-4 transition disabled:opacity-50";

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-ink-3">
        <LoaderCircle className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const connected = !!status?.configured && !status?.error;
  const live = connected && (status?.chatIds.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6 sm:py-7">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          {t("tg.title")}
        </h1>
        <p className="mt-1 text-sm text-ink-2">{t("tg.subtitle")}</p>
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

      {/* ── 1. The bot ── */}
      <section className={card}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold text-ink">
            {t("tg.step1")}
          </h2>
          <span
            className={`label-caps rounded-full px-2 py-1 text-[10px] ${
              connected
                ? "bg-brand/10 text-brand"
                : "bg-copper/10 text-copper"
            }`}
          >
            {connected ? t("tg.connected") : t("tg.notConnected")}
          </span>
        </div>

        {status?.bot && (
          <p className="mt-2 text-sm text-ink-2">
            {t("tg.connectedTo")}{" "}
            <span className="font-semibold text-ink" dir="ltr">
              @{status.bot.username}
            </span>{" "}
            <span className="text-ink-3" dir="ltr">
              ({status.maskedToken})
            </span>
          </p>
        )}
        {status?.error && (
          <p className="mt-2 text-sm text-rose">{status.error}</p>
        )}

        {status?.fromEnv ? (
          <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
            {t("tg.fromEnv")}
          </p>
        ) : (
          <div className="mt-3">
            <label className="label-caps mb-1.5 block text-ink-3">
              {t("tg.tokenLabel")}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="123456789:AA..."
                dir="ltr"
                autoComplete="off"
                className={inputCls}
              />
              <button
                type="button"
                disabled={busy === "saveToken"}
                onClick={async () => {
                  const ok = await act("saveToken", { token });
                  if (ok) {
                    setToken("");
                    setNotice(t("tg.tokenSaved"));
                  }
                }}
                className={`${btn} shrink-0 bg-brand text-on-brand hover:bg-brand-deep`}
              >
                {busy === "saveToken" ? t("common.saving") : t("common.save")}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3">
              {t("tg.tokenHint")}
            </p>
          </div>
        )}
      </section>

      {/* ── 2. Where orders go ── */}
      <section className={card}>
        <h2 className="font-display text-base font-semibold text-ink">
          {t("tg.step2")}
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
          {t("tg.step2Hint", { bot: status?.bot?.username ?? "your bot" })}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onDiscover}
            disabled={!connected || busy === "discover"}
            className={`${btn} border border-brand/40 bg-brand/10 text-brand hover:bg-brand/20`}
          >
            {busy === "discover" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t("tg.findChats")}
          </button>
        </div>

        {/* Chats that have messaged the bot, one tap to add. */}
        {found && found.length > 0 && (
          <ul className="mt-3 space-y-2">
            {found.map((c) => {
              const already = status?.chatIds.includes(c.id);
              return (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-md border border-line bg-sunken px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      <bdi>{c.title}</bdi>
                    </p>
                    <p className="text-[11px] text-ink-3" dir="ltr">
                      {c.type} · {c.id}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={already || busy === "addChat"}
                    onClick={() => act("addChat", { chatId: c.id })}
                    className={`${btn} h-8 shrink-0 border border-brand/40 bg-brand/10 px-3 text-brand hover:bg-brand/20`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {already ? t("tg.added") : t("common.add")}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* The manual way out, for a chat id someone already knows. */}
        <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row">
          <input
            type="text"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder={t("tg.chatIdPlaceholder")}
            dir="ltr"
            className={inputCls}
          />
          <button
            type="button"
            disabled={!manualId.trim() || busy === "addChat"}
            onClick={async () => {
              const ok = await act("addChat", { chatId: manualId });
              if (ok) setManualId("");
            }}
            className={`${btn} shrink-0 border border-line text-ink-2 hover:bg-sunken hover:text-ink`}
          >
            <Plus className="h-4 w-4" />
            {t("tg.addManually")}
          </button>
        </div>
      </section>

      {/* ── 3. Destinations + test ── */}
      <section className={card}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold text-ink">
            {t("tg.step3")}
          </h2>
          <span
            className={`label-caps rounded-full px-2 py-1 text-[10px] ${
              live ? "bg-brand/10 text-brand" : "bg-copper/10 text-copper"
            }`}
          >
            {live ? t("tg.live") : t("tg.notLive")}
          </span>
        </div>

        {status?.chatIds.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-line-strong bg-sunken/40 px-4 py-4 text-[13px] text-ink-3">
            {t("tg.noChats")}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {status?.chatIds.map((id) => (
              <li
                key={id}
                className="flex items-center gap-3 rounded-md border border-line bg-sunken px-3 py-2"
              >
                <Send className="h-4 w-4 shrink-0 text-brand" />
                <span className="flex-1 text-sm text-ink tabular-nums" dir="ltr">
                  {id}
                </span>
                <button
                  type="button"
                  onClick={() => act("removeChat", { chatId: id })}
                  aria-label={t("tg.removeChat")}
                  className="flex h-8 w-8 items-center justify-center rounded text-ink-3 transition hover:bg-rose/10 hover:text-rose"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={onTest}
          disabled={!live || busy === "test"}
          className={`${btn} mt-4 w-full bg-brand text-on-brand hover:bg-brand-deep sm:w-auto`}
        >
          {busy === "test" ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4 flip-rtl" />
          )}
          {t("tg.sendTest")}
        </button>

        <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
          {t("tg.whatGetsSent")}
        </p>
      </section>
    </div>
  );
}
