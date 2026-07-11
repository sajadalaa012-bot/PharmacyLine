// One-time recovery: older app versions saved orders in this device's local
// storage (IndexedDB). This reads those and uploads them to the shared
// database so they appear in the admin everywhere. Safe to run repeatedly —
// each order carries a stable idempotency key, so it can't be duplicated.

import { getAll, STORE } from "./localdb";
import { saveMyOrder } from "./myOrders";

interface LegacyItem {
  product_id?: number | null;
  product_code?: string;
  product_name?: string;
  quantity?: number;
  unit_price?: number;
  subtotal?: number;
  is_free?: boolean;
}
interface LegacyOrder {
  id: number;
  created_at?: string;
  notes?: string;
  discount?: number;
  grand_total?: number;
  status?: string;
  items?: LegacyItem[];
}

const DONE_KEY = "pl_migrated_ids";

function loadDone(): Set<number> {
  try {
    return new Set<number>(JSON.parse(localStorage.getItem(DONE_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

/** Uploads any locally-stored orders to the database. Returns how many were
 *  recovered this run. */
export async function migrateLocalOrders(): Promise<number> {
  if (typeof window === "undefined") return 0;

  let local: LegacyOrder[] = [];
  try {
    local = await getAll<LegacyOrder>(STORE.orders);
  } catch {
    return 0;
  }
  if (!local || local.length === 0) return 0;

  const done = loadDone();
  let recovered = 0;

  for (const o of local) {
    if (o == null || done.has(o.id)) continue;
    const items = (o.items || []).filter((it) => it && it.product_code);
    if (items.length === 0) {
      done.add(o.id);
      continue;
    }
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotency_key: `legacy-${o.id}`,
          notes: o.notes ?? "",
          discount: o.discount ?? 0,
          status: o.status === "approved" ? "approved" : "pending",
          created_at: o.created_at,
          items: items.map((it) => ({
            product_id: it.product_id ?? null,
            product_code: it.product_code,
            product_name: it.product_name ?? it.product_code,
            quantity: it.quantity ?? 1,
            unit_price: it.unit_price ?? 0,
            subtotal: it.subtotal ?? 0,
            is_free: it.is_free === true,
          })),
        }),
      });
      if (res.ok) {
        const saved = (await res.json()) as {
          id: number;
          track_token: string;
          created_at: string;
          grand_total: number;
        };
        saveMyOrder({
          id: saved.id,
          token: saved.track_token,
          created_at: saved.created_at,
          grand_total: saved.grand_total,
        });
        done.add(o.id);
        recovered++;
      }
    } catch {
      // network hiccup — leave it un-done so it retries next open
    }
  }

  localStorage.setItem(DONE_KEY, JSON.stringify([...done]));
  return recovered;
}
