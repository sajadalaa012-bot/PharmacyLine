"use client";

import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";
import { useI18n } from "@/lib/LanguageProvider";

/** The Chromium-only event that lets a site offer its own install button. */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "install-prompt-dismissed";

/**
 * Invitation to keep the shop on the home screen, shown once the browser says
 * the app is installable — and on iOS, where no such event exists, as the
 * Share-sheet recipe instead. Dismissing it is remembered.
 */
export default function InstallPrompt() {
  const { t } = useI18n();
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    const dismissed = (() => {
      try {
        return localStorage.getItem(DISMISSED_KEY) === "1";
      } catch {
        return false;
      }
    })();
    if (standalone || dismissed) return;

    // iOS never fires beforeinstallprompt, so Safari gets the manual recipe.
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !("MSStream" in window) &&
      /Safari/.test(navigator.userAgent);
    if (ios) {
      // Platform and display mode are browser-only facts, so they can only be
      // read after mount — the server has no user agent to render from.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsIOS(true);
      setShow(true);
      return;
    }

    const onPrompt = (event: Event) => {
      // Keep the event: firing it later is what turns the button into an
      // actual install dialog.
      event.preventDefault();
      setDeferred(event as InstallEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      /* private mode — the banner simply returns next visit */
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  };

  if (!show) return null;

  return (
    <div className="pop shrink-0 border-t border-line bg-surface px-4 py-3 sm:hidden">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          {isIOS ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink">
            {t("app.installTitle")}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-ink-3">
            {isIOS ? t("app.installIos") : t("app.installBody")}
          </p>
        </div>
        {isIOS ? (
          <button
            onClick={dismiss}
            aria-label={t("app.notNow")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-3 transition active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={dismiss}
              className="h-9 rounded-full px-3 text-xs font-semibold text-ink-3 transition active:scale-95"
            >
              {t("app.notNow")}
            </button>
            <button
              onClick={install}
              className="h-9 rounded-full bg-brand px-4 text-xs font-bold text-on-brand transition active:scale-95"
            >
              {t("app.install")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
