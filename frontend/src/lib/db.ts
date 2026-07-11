// Postgres access for the order system. A single pooled connection is reused
// across warm serverless invocations. All queries are parameterized.

import { Pool, type QueryResultRow } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };

function makePool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add your Postgres connection string to the environment.",
    );
  }
  // Hosted Postgres (Neon/Supabase/Vercel) requires SSL; local usually doesn't.
  const useSSL =
    process.env.DATABASE_SSL === "true" ||
    (/sslmode=require|neon\.tech|supabase|pooler|render\.com|vercel/.test(
      connectionString,
    ) &&
      process.env.DATABASE_SSL !== "false");

  return new Pool({
    connectionString,
    ssl: useSSL ? { rejectUnauthorized: false } : undefined,
    max: 5,
  });
}

export function getPool(): Pool {
  if (!globalForPg.__pgPool) globalForPg.__pgPool = makePool();
  return globalForPg.__pgPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<{ rows: T[]; rowCount: number }> {
  const res = await getPool().query<T>(text, params);
  return { rows: res.rows, rowCount: res.rowCount ?? 0 };
}

// ── Schema (idempotent; runs once per instance) ─────────────────────

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) schemaReady = initSchema();
  return schemaReady;
}

async function initSchema(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS orders (
      id              BIGSERIAL PRIMARY KEY,
      order_number    TEXT UNIQUE,
      idempotency_key TEXT UNIQUE,
      customer_name   TEXT NOT NULL,
      customer_email  TEXT NOT NULL,
      customer_phone  TEXT NOT NULL,
      shipping_address TEXT NOT NULL,
      billing_address  TEXT,
      subtotal        NUMERIC(14,2) NOT NULL DEFAULT 0,
      shipping_cost   NUMERIC(14,2) NOT NULL DEFAULT 0,
      tax             NUMERIC(14,2) NOT NULL DEFAULT 0,
      discount        NUMERIC(14,2) NOT NULL DEFAULT 0,
      total           NUMERIC(14,2) NOT NULL DEFAULT 0,
      payment_method  TEXT NOT NULL DEFAULT 'cash_on_delivery',
      payment_status  TEXT NOT NULL DEFAULT 'pending'
                      CHECK (payment_status IN ('pending','paid','failed')),
      order_status    TEXT NOT NULL DEFAULT 'pending'
                      CHECK (order_status IN ('pending','processing','shipped','delivered','cancelled')),
      notes           TEXT NOT NULL DEFAULT '',
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id           BIGSERIAL PRIMARY KEY,
      order_id     BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id   INTEGER,
      product_code TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity     INTEGER NOT NULL DEFAULT 1,
      unit_price   NUMERIC(14,2) NOT NULL DEFAULT 0,
      subtotal     NUMERIC(14,2) NOT NULL DEFAULT 0,
      is_free      BOOLEAN NOT NULL DEFAULT false
    );

    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders (order_status);
    CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders (payment_status);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
  `);
}
