// Postgres access for orders. One pooled connection reused across warm
// serverless invocations; all queries are parameterized.

import { Pool, type QueryResultRow } from "pg";

const globalForPg = globalThis as unknown as { __pgPool?: Pool };

function makePool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add your Postgres connection string.",
    );
  }
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

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) schemaReady = initSchema();
  return schemaReady;
}

async function initSchema(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS orders (
      id              BIGSERIAL PRIMARY KEY,
      idempotency_key TEXT UNIQUE,
      track_token     TEXT NOT NULL,
      notes           TEXT NOT NULL DEFAULT '',
      discount        NUMERIC(14,2) NOT NULL DEFAULT 0,
      grand_total     NUMERIC(14,2) NOT NULL DEFAULT 0,
      status          TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved')),
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
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);

    -- Pharmacy directory, shared across devices. Folders let the admin
    -- group pharmacies under names they choose; deleting a folder leaves its
    -- pharmacies in place (folder_id becomes NULL → "Unfiled").
    CREATE TABLE IF NOT EXISTS pharmacy_folders (
      id           BIGSERIAL PRIMARY KEY,
      name         TEXT NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS pharmacies (
      id           BIGSERIAL PRIMARY KEY,
      folder_id    BIGINT REFERENCES pharmacy_folders(id) ON DELETE SET NULL,
      name         TEXT NOT NULL,
      phone        TEXT NOT NULL DEFAULT '',
      location     TEXT NOT NULL DEFAULT '',
      notes        TEXT NOT NULL DEFAULT '',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_pharmacies_folder_id ON pharmacies (folder_id);

    -- Map pin for the visit map. Resolved from "location" when a pharmacy is
    -- saved, or set by dragging the pin on /admin/map. NULL = not pinned yet.
    ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
    ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
  `);
}
