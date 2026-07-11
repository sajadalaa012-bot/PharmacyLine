// Server-side order data access + validation for the simple order model
// (notes, discount, items, status: pending|approved). Totals are computed
// from the line items — client-sent totals are not trusted.

import { randomUUID } from "crypto";
import { getPool, ensureSchema } from "./db";
import { Order, OrderItem, OrderStatus } from "@/types";

export class OrderValidationError extends Error {}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

export interface OrderInput {
  notes: string;
  discount: number;
  items: {
    product_id: number | null;
    product_code: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    is_free: boolean;
  }[];
  idempotency_key?: string;
}

export function validateOrderInput(body: unknown): OrderInput {
  if (!body || typeof body !== "object")
    throw new OrderValidationError("Invalid request body.");
  const b = body as Record<string, unknown>;

  if (!Array.isArray(b.items) || b.items.length === 0)
    throw new OrderValidationError("Order must have at least one item.");

  const items = b.items.map((raw, i) => {
    const it = raw as Record<string, unknown>;
    const quantity = Math.floor(num(it.quantity, 0));
    const unit_price = num(it.unit_price, 0);
    const is_free = it.is_free === true;
    const product_code = typeof it.product_code === "string" ? it.product_code : "";
    const product_name = typeof it.product_name === "string" ? it.product_name : "";
    if (!product_code || !product_name)
      throw new OrderValidationError(`Item ${i + 1} is missing product info.`);
    if (quantity < 1)
      throw new OrderValidationError(`Item ${i + 1} needs quantity ≥ 1.`);
    if (unit_price < 0)
      throw new OrderValidationError(`Item ${i + 1} has an invalid price.`);
    return {
      product_id:
        it.product_id == null ? null : Math.floor(num(it.product_id, 0)) || null,
      product_code,
      product_name,
      quantity,
      unit_price,
      subtotal: is_free ? 0 : quantity * unit_price,
      is_free,
    };
  });

  return {
    notes: typeof b.notes === "string" ? b.notes : "",
    discount: Math.max(0, num(b.discount, 0)),
    items,
    idempotency_key:
      typeof b.idempotency_key === "string" ? b.idempotency_key : undefined,
  };
}

// ── Mapping ──────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

function mapItem(r: Row): OrderItem {
  return {
    id: Number(r.id),
    product_id: r.product_id == null ? 0 : Number(r.product_id),
    product_code: String(r.product_code),
    product_name: String(r.product_name),
    quantity: Number(r.quantity),
    unit_price: num(r.unit_price),
    subtotal: num(r.subtotal),
    is_free: Boolean(r.is_free),
  };
}

function mapOrder(r: Row, items: OrderItem[]): Order {
  return {
    id: Number(r.id),
    created_at:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : String(r.created_at),
    notes: String(r.notes ?? ""),
    discount: num(r.discount),
    grand_total: num(r.grand_total),
    status: String(r.status) as OrderStatus,
    items,
  };
}

// ── Create (idempotent, server-computed total) ───────────────────────

export async function createOrder(
  input: OrderInput,
  status: OrderStatus,
): Promise<Order & { track_token: string }> {
  await ensureSchema();
  const pool = getPool();
  const subtotal = input.items.reduce((s, it) => s + it.subtotal, 0);
  const grand_total = Math.max(0, subtotal - input.discount);
  const token = randomUUID();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (input.idempotency_key) {
      const dup = await client.query(
        "SELECT id, track_token FROM orders WHERE idempotency_key = $1",
        [input.idempotency_key],
      );
      if (dup.rows[0]) {
        await client.query("ROLLBACK");
        const existing = await getOrder(Number(dup.rows[0].id));
        if (existing)
          return { ...existing, track_token: String(dup.rows[0].track_token) };
      }
    }

    const ins = await client.query(
      `INSERT INTO orders (idempotency_key, track_token, notes, discount, grand_total, status)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [
        input.idempotency_key ?? null,
        token,
        input.notes,
        input.discount,
        grand_total,
        status,
      ],
    );
    const id = Number(ins.rows[0].id);
    for (const it of input.items) {
      await client.query(
        `INSERT INTO order_items
          (order_id, product_id, product_code, product_name, quantity, unit_price, subtotal, is_free)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          id,
          it.product_id,
          it.product_code,
          it.product_name,
          it.quantity,
          it.unit_price,
          it.subtotal,
          it.is_free,
        ],
      );
    }
    await client.query("COMMIT");
    const created = await getOrder(id);
    if (!created) throw new Error("Order vanished after insert.");
    return { ...created, track_token: token };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    const code = (err as { code?: string }).code;
    if (code === "23505" && input.idempotency_key) {
      const dup = await pool.query(
        "SELECT id, track_token FROM orders WHERE idempotency_key = $1",
        [input.idempotency_key],
      );
      if (dup.rows[0]) {
        const existing = await getOrder(Number(dup.rows[0].id));
        if (existing)
          return { ...existing, track_token: String(dup.rows[0].track_token) };
      }
    }
    throw err;
  } finally {
    client.release();
  }
}

// ── Read ─────────────────────────────────────────────────────────────

export async function getOrder(id: number): Promise<Order | null> {
  await ensureSchema();
  const pool = getPool();
  const o = await pool.query("SELECT * FROM orders WHERE id = $1", [id]);
  if (!o.rows[0]) return null;
  const items = await pool.query(
    "SELECT * FROM order_items WHERE order_id = $1 ORDER BY id",
    [id],
  );
  return mapOrder(o.rows[0], items.rows.map(mapItem));
}

export async function listOrders(): Promise<Order[]> {
  await ensureSchema();
  const pool = getPool();
  const o = await pool.query(
    "SELECT * FROM orders ORDER BY created_at DESC, id DESC",
  );
  const ids = o.rows.map((r) => Number(r.id));
  const byOrder = new Map<number, OrderItem[]>();
  if (ids.length) {
    const items = await pool.query(
      "SELECT * FROM order_items WHERE order_id = ANY($1::bigint[]) ORDER BY id",
      [ids],
    );
    for (const row of items.rows) {
      const oid = Number(row.order_id);
      if (!byOrder.has(oid)) byOrder.set(oid, []);
      byOrder.get(oid)!.push(mapItem(row));
    }
  }
  return o.rows.map((r) => mapOrder(r, byOrder.get(Number(r.id)) ?? []));
}

// ── Replace (admin edit / approve) ───────────────────────────────────

export async function replaceOrder(
  id: number,
  input: OrderInput,
  status: OrderStatus,
): Promise<Order | null> {
  await ensureSchema();
  const pool = getPool();
  const subtotal = input.items.reduce((s, it) => s + it.subtotal, 0);
  const grand_total = Math.max(0, subtotal - input.discount);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const upd = await client.query(
      `UPDATE orders SET notes = $1, discount = $2, grand_total = $3, status = $4
       WHERE id = $5 RETURNING id`,
      [input.notes, input.discount, grand_total, status, id],
    );
    if (!upd.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }
    await client.query("DELETE FROM order_items WHERE order_id = $1", [id]);
    for (const it of input.items) {
      await client.query(
        `INSERT INTO order_items
          (order_id, product_id, product_code, product_name, quantity, unit_price, subtotal, is_free)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          id,
          it.product_id,
          it.product_code,
          it.product_name,
          it.quantity,
          it.unit_price,
          it.subtotal,
          it.is_free,
        ],
      );
    }
    await client.query("COMMIT");
    return getOrder(id);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// ── Delete ───────────────────────────────────────────────────────────

export async function deleteOrder(id: number): Promise<boolean> {
  await ensureSchema();
  const res = await getPool().query("DELETE FROM orders WHERE id = $1", [id]);
  return (res.rowCount ?? 0) > 0;
}

// ── Public tracking (customer's own order via id + secret token) ─────

export interface OrderTracking {
  id: number;
  created_at: string;
  status: OrderStatus;
  grand_total: number;
}

export async function trackOrder(
  id: number,
  token: string,
): Promise<OrderTracking | null> {
  await ensureSchema();
  const res = await getPool().query(
    "SELECT id, created_at, status, grand_total FROM orders WHERE id = $1 AND track_token = $2",
    [id, token],
  );
  const r = res.rows[0];
  if (!r) return null;
  return {
    id: Number(r.id),
    created_at:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : String(r.created_at),
    status: String(r.status) as OrderStatus,
    grand_total: num(r.grand_total),
  };
}
