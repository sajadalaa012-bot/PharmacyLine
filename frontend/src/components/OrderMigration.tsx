"use client";

import { useEffect, useState } from "react";
import { migrateLocalOrders } from "@/lib/migrateLocalOrders";

/** Runs once when the app opens: recovers any orders saved locally by older
 *  app versions into the shared database, and shows a confirmation banner. */
export default function OrderMigration() {
  const [count, setCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    migrateLocalOrders()
      .then((n) => {
        if (n > 0) setCount(n);
      })
      .catch(() => {});
  }, []);

  if (count <= 0 || dismissed) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-3 bg-brand px-4 py-2.5 text-center text-sm font-semibold text-on-brand shadow-lg">
      <span>
        ✓ Recovered {count} previous order{count === 1 ? "" : "s"} — they now
        appear in your admin.
      </span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="rounded px-2 leading-none hover:bg-black/10"
      >
        ×
      </button>
    </div>
  );
}
