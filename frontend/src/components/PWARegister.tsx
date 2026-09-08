"use client";

// Registers the service worker, and shows the two things a person actually
// needs to know about one: that the shop is running without a connection, and
// that a newer version of it is ready to load.
//
// Both are one slim pill above the tab bar rather than a banner: neither is an
// error, and neither should take a row off the screen. The offline pill has no
// action, because there is nothing to press. The update pill does.

import { useEffect, useRef, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/LanguageProvider";

export default function PWARegister() {
  const { t } = useI18n();
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [offline, setOffline] = useState(false);
  // Set only when this page asked the new worker to take over. A first-ever
  // install also changes the controller (the worker claims the page as it
  // activates), and reloading on that would bounce every new visitor.
  const accepted = useRef(false);

  useEffect(() => {
    // Connection state is a browser-only fact, so it can only be read after
    // mount: the server has no network status to render from.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffline(!navigator.onLine);
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    // Kept so the visibility listener can be taken off again on unmount.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => reg?.update())
        .catch(() => {});
    };

    navigator.serviceWorker
      // updateViaCache: "none" so the browser checks the worker itself against
      // the network rather than serving a day-old copy of it from its HTTP
      // cache. Without this a deploy can take a full day to reach a phone.
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        if (cancelled) return;

        /** A worker that has installed and is waiting to take over. */
        const check = () => {
          if (reg.waiting && navigator.serviceWorker.controller)
            setWaiting(reg.waiting);
        };
        check();

        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            // "installed" with a controller already in place means this is an
            // update, not a first install. A first install should just start
            // working, silently.
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setWaiting(installing);
            }
          });
        });

        // Look for a new version when the app is brought back to the front,
        // which is when a phone user is most likely to accept a reload.
        document.addEventListener("visibilitychange", onVisible);
      })
      .catch(() => {
        /* PWA is progressive enhancement - ignore registration failures */
      });

    // The new worker taking over is the moment to show the new version - but
    // only when this page is the one that asked for it.
    let reloading = false;
    const onControllerChange = () => {
      if (!accepted.current || reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  const refresh = () => {
    accepted.current = true;
    waiting?.postMessage("skip-waiting");
    setWaiting(null);
  };

  if (!waiting && !offline) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 4.75rem)" }}
    >
      <div
        role="status"
        className="pop pointer-events-auto flex items-center gap-2.5 rounded-full border border-line
                   bg-surface/95 py-2 ps-4 pe-2 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)] backdrop-blur-md"
      >
        {waiting ? (
          <>
            <span className="text-[13px] font-medium text-ink">
              {t("app.updateReady")}
            </span>
            <button
              onClick={refresh}
              className="flex h-8 items-center gap-1.5 rounded-full bg-brand px-3.5 text-xs font-bold text-on-brand transition active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t("app.refresh")}
            </button>
          </>
        ) : (
          <span className="flex items-center gap-2 pe-2 text-[13px] font-medium text-ink-2">
            <CloudOff className="h-4 w-4 text-ink-3" />
            {t("app.offline")}
          </span>
        )}
      </div>
    </div>
  );
}
