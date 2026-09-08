"use client";

// The offer to tell a customer when their order has been approved, shown on
// the confirmation screen because that is the one moment they are waiting for
// news and the question answers itself.
//
// It hides rather than degrades. A browser that cannot do push, a shop that
// has not set its keys up, an order this device does not hold the token for:
// in every case there is nothing useful to show, so nothing is shown.

import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { useI18n } from "@/lib/LanguageProvider";
import { getMyOrders } from "@/lib/myOrders";
import {
  currentSubscription,
  pushBlocked,
  pushSupported,
  subscribe,
} from "@/lib/pushClient";

type State = "hidden" | "offer" | "working" | "on" | "blocked" | "failed";

export default function OrderNotify({ orderId }: { orderId: number }) {
  const { t } = useI18n();
  const [state, setState] = useState<State>("hidden");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!pushSupported()) return;

      // The secret the order was placed with, kept on this device. Without it
      // the server will not register a subscription, and rightly so.
      const saved = getMyOrders().find((o) => o.id === orderId);
      if (!saved) return;

      const res = await fetch("/api/push/key", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : { key: null }))
        .catch(() => ({ key: null }));
      if (cancelled || !res.key) return;

      setToken(saved.token);
      if (pushBlocked()) {
        setState("blocked");
        return;
      }
      // Already listening on this device: say so rather than offering again.
      setState((await currentSubscription()) ? "on" : "offer");
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (state === "hidden" || !token) return null;

  const turnOn = async () => {
    setState("working");
    const outcome = await subscribe("order", { id: orderId, token });
    setState(
      outcome === "subscribed"
        ? "on"
        : outcome === "blocked"
          ? "blocked"
          : "failed",
    );
  };

  const on = state === "on";

  return (
    <div
      className={`mt-5 flex items-center gap-3 rounded-xl border p-3.5 text-start transition ${
        on ? "border-brand/30 bg-brand/5" : "border-line bg-sunken/40"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          on ? "bg-brand/12 text-brand" : "bg-surface text-ink-3"
        }`}
      >
        {on ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-ink">
          {on ? t("notify.on") : t("notify.title")}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-3">
          {state === "blocked"
            ? t("notify.blocked")
            : state === "failed"
              ? t("notify.failed")
              : on
                ? ""
                : t("notify.body")}
        </p>
      </div>

      {!on && state !== "blocked" && (
        <button
          onClick={turnOn}
          disabled={state === "working"}
          className="h-9 shrink-0 rounded-full bg-brand px-4 text-xs font-bold text-on-brand transition active:scale-95 disabled:opacity-60"
        >
          {state === "working" ? t("notify.working") : t("notify.turnOn")}
        </button>
      )}
    </div>
  );
}
