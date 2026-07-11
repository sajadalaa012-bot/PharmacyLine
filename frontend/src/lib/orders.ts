// Server-side order data access + validation. All money totals are computed
// here from the line items — client-supplied totals are never trusted.

import { getPool, ensureSchema } from "./db";
import {
  Order,
  OrderItem,
  CreateOrderInput,
  OrderStatus,
  PaymentStatus,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
} from "@/types";

export class OrderValidationError extends Error {}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

// ── Validation ───────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCreateInput(body: unknown): CreateOrderInput {
  if (!body || typeof body !== "object") {
    throw new OrderValidationError("Invalid request body.");
  }
  const b = body as Record<string, unknown>;

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const customer_name = str(b.customer_name);
  const customer_email = str(b.customer_email);
  const customer_phone = str(b.customer_phone);
  const shipping_address = str(b.shipping_address);
  const payment_method = str(b.payment_method) || "cash_on_delivery";

  if (!customer_name) throw new OrderValidationError("Customer name is required.");
  if (!EMAIL_RE.test(customer_email))
    throw new OrderValidationError("A valid email is required.");
  if (!customer_phone) throw new OrderValidationError("Phone number is required.");
  if (!shipping_address)
    throw new OrderValidationError("Shipping address is required.");
  if (!PAYMENT_METHODS.includes(payment_method as never))
    throw new OrderValidationError("Invalid payment method.");

  if (!Array.isArray(b.items) || b.items.length === 0)
    throw new OrderValidationError("Order must have at least one item.");

  const items = b.items.map((raw, i) => {
    const it = raw as Record<string, unknown>;
    const quantity = Math.floor(num(it.quantity, 0));
    const unit_price = num(it.unit_price, 0);
    const is_free = it.is_free === true;
    const product_code = str(it.product_code);
    const product_name = str(it.product_name);
    if (!product_code || !product_name)
      throw new OrderValidationError(`Item ${i + 1} is missing product info.`);
    if (quantity < 1)
      throw new OrderValidationError(`Item ${i + 1} needs a quantity of at least 1.`);
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
    idempotency_key: str(b.idempotency_key) || "",
    customer_name,
    customer_email,
    customer_phone,
    shipping_address,
    billing_address: str(b.billing_address) || null,
    payment_method,
    notes: str(b.notes),
    shipping_cost: Math.max(0, num(b.shipping_cost, 0)),
    tax: Math.max(0, num(b.tax, 0)),
    discount: Math.max(0, num(b.discount, 0)),
    items,
  };
}

// ── Row mapping ──────────────────────────────────────────────────────

type OrderRow = Record<string, unknown>;

function mapItem(r: OrderRow): OrderItem {
  return {
    id: Number(r.id),
    product_id: r.product_id == null ? null : Number(r.product_id),
    product_code: String(r.product_code),
    product_name: String(r.product_name),
    quantity: Number(r.quantity),
    unit_price: num(r.unit_price),
    subtotal: num(r.subtotal),
    is_free: Boolean(r.is_free),
  };
}

function mapOrder(r: OrderRow, items: OrderItem[]): Order {
  const created = r.created_at;
  return {
    id: Number(r.id),
    order_number: String(r.order_number ?? ""),
    customer_name: String(r.customer_name),
    customer_email: String(r.customer_email),
    customer_phone: String(r.customer_phone),
    shipping_address: String(r.shipping_address),
    billing_address: r.billing_address == null ? null : String(r.billing_address),
    subtotal: num(r.subtotal),
    shipping_cost: num(r.shipping_cost),
    tax: num(r.tax),
    discount: num(r.discount),
    total: num(r.total),
    payment_method: String(r.payment_method),
    payment_status: String(r.payment_status) as PaymentStatus,
    order_status: String(r.order_status) as OrderStatus,
    notes: String(r.notes ?? ""),
    created_at:
      created instanceof Date ? created.toISOString() : String(created),
    items,
  };
}

// ── Create (idempotent, server-computed totals) ──────────────────────

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  await ensureSchema();
  const pool = getPool();

  const subtotal = input.items.reduce((s, it) => s + it.subtotal, 0);
  const shipping_cost = input.shipping_cost ?? 0;
  const tax = input.tax ?? 0;
  const discount = input.discount ?? 0;
  const total = Math.max(0, subtotal + shipping_cost + tax - discount);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Reuse an existing order for the same idempotency key (refresh-safe).
    if (input.idempotency_key) {
      const dup = await client.query(
        "SELECT id FROM orders WHERE idempotency_key = $1",
        [input.idempotency_key],
      );
      if (dup.rows[0]) {
        await client.query("ROLLBACK");
        const existing = await getOrder(Number(dup.rows[0].id));
        if (existing) return existing;
      }
    }

    const ins = await client.query(
      `INSERT INTO orders
        (idempotency_key, customer_name, customer_email, customer_phone,
         shipping_address, billing_address, subtotal, shipping_cost, tax,
         discount, total, payment_method, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id`,
      [
        input.idempotency_key || null,
        input.customer_name,
        input.customer_email,
        input.customer_phone,
        input.shipping_address,
        input.billing_address ?? null,
        subtotal,
        shipping_cost,
        tax,
        discount,
        total,
        input.payment_method,
        input.notes ?? "",
      ],
    );
    const id = Number(ins.rows[0].id);
    const orderNumber = `PL-${String(id).padStart(5, "0")}`;
    await client.query("UPDATE orders SET order_number = $1 WHERE id = $2", [
      orderNumber,
      id,
    ]);

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
    return created;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    // Unique idempotency race → return the winner.
    const code = (err as { code?: string }).code;
    if (code === "23505" && input.idempotency_key) {
      const dup = await pool.query(
        "SELECT id FROM orders WHERE idempotency_key = $1",
        [input.idempotency_key],
      );
      if (dup.rows[0]) {
        const existing = await getOrder(Number(dup.rows[0].id));
        if (existing) return existing;
      }
    }
    throw err;
  } finally {
    client.release();
  }
}

// ── Read one ─────────────────────────────────────────────────────────

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

// ── List with search / filter / pagination ───────────────────────────

export interface ListParams {
  search?: string;
  order_status?: string;
  payment_status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export async function listOrders(
  params: ListParams,
): Promise<{ orders: Order[]; total: number; page: number; pageSize: number }> {
  await ensureSchema();
  const pool = getPool();

  const where: string[] = [];
  const args: unknown[] = [];
  const add = (clause: string, value: unknown) => {
    args.push(value);
    where.push(clause.replace("?", `$${args.length}`));
  };

  const search = params.search?.trim();
  if (search) {
    args.push(`%${search}%`);
    const p = `$${args.length}`;
    where.push(
      `(order_number ILIKE ${p} OR customer_name ILIKE ${p} OR customer_email ILIKE ${p} OR CAST(id AS TEXT) ILIKE ${p})`,
    );
  }
  if (params.order_status && ORDER_STATUSES.includes(params.order_status as never))
    add("order_status = ?", params.order_status);
  if (
    params.payment_status &&
    PAYMENT_STATUSES.includes(params.payment_status as never)
  )
    add("payment_status = ?", params.payment_status);
  if (params.dateFrom) add("created_at >= ?", params.dateFrom);
  if (params.dateTo) add("created_at <= ?", params.dateTo);

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS c FROM orders ${whereSql}`,
    args,
  );
  const total = Number(countRes.rows[0].c);

  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize ?? 20)));
  const offset = (page - 1) * pageSize;

  const listRes = await pool.query(
    `SELECT * FROM orders ${whereSql}
     ORDER BY created_at DESC, id DESC
     LIMIT $${args.length + 1} OFFSET $${args.length + 2}`,
    [...args, pageSize, offset],
  );

  const ids = listRes.rows.map((r) => Number(r.id));
  const itemsByOrder = new Map<number, OrderItem[]>();
  if (ids.length) {
    const itemsRes = await pool.query(
      `SELECT * FROM order_items WHERE order_id = ANY($1::bigint[]) ORDER BY id`,
      [ids],
    );
    for (const row of itemsRes.rows) {
      const oid = Number(row.order_id);
      if (!itemsByOrder.has(oid)) itemsByOrder.set(oid, []);
      itemsByOrder.get(oid)!.push(mapItem(row));
    }
  }

  const orders = listRes.rows.map((r) =>
    mapOrder(r, itemsByOrder.get(Number(r.id)) ?? []),
  );
  return { orders, total, page, pageSize };
}

// ── Update statuses ──────────────────────────────────────────────────

export async function updateOrderStatuses(
  id: number,
  updates: { order_status?: string; payment_status?: string },
): Promise<Order | null> {
  await ensureSchema();
  const sets: string[] = [];
  const args: unknown[] = [];

  if (updates.order_status !== undefined) {
    if (!ORDER_STATUSES.includes(updates.order_status as never))
      throw new OrderValidationError("Invalid order status.");
    args.push(updates.order_status);
    sets.push(`order_status = $${args.length}`);
  }
  if (updates.payment_status !== undefined) {
    if (!PAYMENT_STATUSES.includes(updates.payment_status as never))
      throw new OrderValidationError("Invalid payment status.");
    args.push(updates.payment_status);
    sets.push(`payment_status = $${args.length}`);
  }
  if (!sets.length) throw new OrderValidationError("No changes provided.");

  args.push(id);
  const res = await getPool().query(
    `UPDATE orders SET ${sets.join(", ")} WHERE id = $${args.length} RETURNING id`,
    args,
  );
  if (!res.rows[0]) return null;
  return getOrder(id);
}

// ── Delete ───────────────────────────────────────────────────────────

export async function deleteOrder(id: number): Promise<boolean> {
  await ensureSchema();
  const res = await getPool().query("DELETE FROM orders WHERE id = $1", [id]);
  return (res.rowCount ?? 0) > 0;
}

// ── Public tracking (customer looks up their own order) ──────────────
// Requires BOTH the order number and the matching email, so it can't be
// used to enumerate other people's orders.

export interface OrderTracking {
  order_number: string;
  created_at: string;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  total: number;
}

export async function trackOrder(
  orderNumber: string,
  email: string,
): Promise<OrderTracking | null> {
  await ensureSchema();
  const res = await getPool().query(
    `SELECT order_number, created_at, order_status, payment_status, total
       FROM orders
      WHERE order_number = $1 AND LOWER(customer_email) = LOWER($2)`,
    [orderNumber.trim(), email.trim()],
  );
  const r = res.rows[0];
  if (!r) return null;
  return {
    order_number: String(r.order_number),
    created_at:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : String(r.created_at),
    order_status: String(r.order_status) as OrderStatus,
    payment_status: String(r.payment_status) as PaymentStatus,
    total: num(r.total),
  };
}
