// Remembers, on this device, the orders this customer placed (id + secret
// track token) so the "My Orders" view can show them and fetch live status
// from the server without exposing anyone else's orders.

const KEY = "pl_my_orders";

export interface SavedOrder {
  id: number;
  token: string;
  created_at: string;
  grand_total: number;
}

export function getMyOrders(): SavedOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedOrder[]) : [];
  } catch {
    return [];
  }
}

export function saveMyOrder(o: SavedOrder): void {
  if (typeof window === "undefined") return;
  const list = getMyOrders();
  if (list.some((x) => x.id === o.id)) return;
  list.unshift(o);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)));
}
