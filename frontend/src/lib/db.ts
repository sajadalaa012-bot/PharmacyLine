// Postgres access for the shop — the catalog, the orders, the handful of
// settings an admin changes at runtime. One pooled connection reused across
// warm serverless invocations; all queries are parameterized.

import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { createHash } from "node:crypto";

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

  const pool = new Pool({
    connectionString,
    ssl: useSSL ? { rejectUnauthorized: false } : undefined,
    // A serverless instance serves one request at a time, and the widest
    // thing any request does is listCatalog's two parallel queries. Holding
    // more than that open only spends the database's connection limit — and a
    // burst of cold starts is exactly when that limit bites.
    max: 3,
    // Fail fast rather than hang until the platform kills the function: a
    // database briefly out of connections should surface as an error that
    // connect() can retry, not as a dead request.
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
  });

  // Hosted Postgres drops idle connections routinely, and node-postgres
  // reports that as an 'error' event on the pool. With no listener, Node
  // re-raises it as an uncaught exception and takes down the whole function —
  // including whatever request happened to be in flight.
  pool.on("error", (err) => {
    console.error("Postgres pool error on an idle client:", err);
  });
  return pool;
}

export function getPool(): Pool {
  if (!globalForPg.__pgPool) globalForPg.__pgPool = makePool();
  return globalForPg.__pgPool;
}

// ── Connecting ──────────────────────────────────────────────────────

/**
 * True for a failure that happened *before* any statement reached the
 * database: the pool could not hand back a usable connection. Retrying those
 * is safe for reads and writes alike, because nothing ran.
 */
function isConnectFault(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  switch (e?.code) {
    case "53300": // too_many_connections
    case "57P03": // cannot_connect_now — the server is still coming up
    case "ECONNREFUSED":
    case "ECONNRESET":
    case "ETIMEDOUT":
    case "EPIPE":
      return true;
  }
  return /timeout exceeded when trying to connect|Connection terminated/i.test(
    e?.message ?? "",
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * A pooled client, retrying a refused or exhausted connection. Everyone
 * arriving at once is the normal case for a serverless shop, not an
 * exceptional one: a shopper should wait a few hundred milliseconds rather
 * than be told the shop could not load.
 */
export async function connect(): Promise<PoolClient> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await getPool().connect();
    } catch (err) {
      if (!isConnectFault(err)) throw err;
      lastErr = err;
      await sleep(150 * (attempt + 1));
    }
  }
  throw lastErr;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<{ rows: T[]; rowCount: number }> {
  const client = await connect();
  try {
    const res = await client.query<T>(text, params);
    return { rows: res.rows, rowCount: res.rowCount ?? 0 };
  } finally {
    client.release();
  }
}

// ── Schema ──────────────────────────────────────────────────────────

const SCHEMA_SQL = `
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

    -- The catalog. It used to live in each visitor's IndexedDB, which meant an
    -- admin's edits never left the browser that made them. Here it is shared:
    -- the admin writes, every visitor reads. Seeded once from the bundled
    -- data/catalog.json (see seedCatalog in lib/catalog.ts); after that the
    -- database is the source of truth and the JSON file is only a fallback for
    -- an empty database.
    CREATE TABLE IF NOT EXISTS categories (
      id            INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      name          TEXT NOT NULL,
      name_ar       TEXT NOT NULL DEFAULT '',
      display_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id             INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      name           TEXT NOT NULL,
      code           TEXT NOT NULL UNIQUE,
      price          NUMERIC(14,2) NOT NULL DEFAULT 0,
      image_url      TEXT NOT NULL DEFAULT '',
      category_id    INTEGER NOT NULL REFERENCES categories(id),
      description    TEXT NOT NULL DEFAULT '',
      benefits       TEXT NOT NULL DEFAULT '',
      ingredients    TEXT NOT NULL DEFAULT '',
      "usage"        TEXT NOT NULL DEFAULT '',
      name_ar        TEXT NOT NULL DEFAULT '',
      description_ar TEXT NOT NULL DEFAULT '',
      benefits_ar    TEXT NOT NULL DEFAULT '',
      ingredients_ar TEXT NOT NULL DEFAULT '',
      usage_ar       TEXT NOT NULL DEFAULT '',
      -- NULL means this product's stock isn't tracked, so it stays
      -- purchasable. 0 means genuinely out of stock. See isOutOfStock().
      stock          INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);

    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);

    -- Who placed the order and where it goes. Added after the first orders
    -- were taken, so they default to empty rather than being NOT NULL from
    -- the start; the storefront asks for all three before it will submit.
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT NOT NULL DEFAULT '';
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT NOT NULL DEFAULT '';
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_location TEXT NOT NULL DEFAULT '';

    -- The "was" price of a product on offer. NULL is the normal case: no
    -- offer, one price. Added after the catalog was already live, so it is
    -- nullable rather than defaulted — see isDiscounted().
    ALTER TABLE products ADD COLUMN IF NOT EXISTS old_price NUMERIC(14,2);

    -- The options a product is sold in (size, flavour, shade). A JSON array
    -- rather than a table of its own: options are only ever read and written
    -- with the product that owns them, never queried across products, and a
    -- product update already replaces every field in one statement.
    ALTER TABLE products ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]'::jsonb;

    -- Which option an order line was for. Both are snapshots taken when the
    -- line was added, like product_name beside them: renaming an option later
    -- must not rewrite what a customer already ordered.
    ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id TEXT;
    ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_name TEXT;

    -- Settings an admin changes at runtime, which would otherwise need a
    -- redeploy. Currently the Telegram destination chats. See lib/settings.ts.
    CREATE TABLE IF NOT EXISTS app_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Product types: Serum, Cleanser, Sunscreen. The second way to narrow the
    -- catalogue, alongside the brand.
    --
    -- Worth saying plainly: the categories table above holds the shop's
    -- BRANDS. It was named back when the catalogue was grouped only one way,
    -- and renaming a live table that every product points at is not worth the
    -- risk. This is the actual category; both are labelled properly in the UI.
    CREATE TABLE IF NOT EXISTS product_categories (
      id            INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      name          TEXT NOT NULL,
      name_ar       TEXT NOT NULL DEFAULT '',
      display_order INTEGER NOT NULL DEFAULT 0
    );

    -- NULL means nobody has typed this product yet. It still sells; it just
    -- doesn't answer to a category filter. ON DELETE SET NULL so removing a
    -- category never takes products with it.
    ALTER TABLE products ADD COLUMN IF NOT EXISTS product_category_id INTEGER
      REFERENCES product_categories(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_products_product_category
      ON products (product_category_id);

    -- The pharmacy directory and its visit map were removed from the admin.
    -- Their tables are deliberately left alone rather than dropped here: a
    -- schema bootstrap is the wrong place to destroy data someone typed in.
    -- Drop pharmacies and pharmacy_folders by hand if you want the space.
`;

/**
 * Changes whenever SCHEMA_SQL does, which is the whole point: the bootstrap
 * runs after a deploy that edits the schema and is skipped by every cold start
 * afterwards. Nothing to remember to bump by hand.
 */
const SCHEMA_HASH = createHash("sha256")
  .update(SCHEMA_SQL)
  .digest("hex")
  .slice(0, 16);

/** Any constant works as long as every instance uses the same one. */
const SCHEMA_LOCK = 724302;

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = initSchema().catch((err) => {
      // Never cache a failure. A blip during bootstrap would otherwise leave
      // this instance telling every visitor it serves that the shop could not
      // load, for the rest of its life.
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

/** The schema version this database was last brought up to, if any. */
async function recordedHash(client: PoolClient): Promise<string | null> {
  // A missing app_settings has to be checked separately: selecting from a
  // table that does not exist fails at parse time, and inside a transaction
  // that would abort everything after it.
  const reg = await client.query<{ t: string | null }>(
    "SELECT to_regclass('public.app_settings') AS t",
  );
  if (!reg.rows[0]?.t) return null;
  const res = await client.query<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = 'schema_hash'",
  );
  return res.rows[0]?.value ?? null;
}

async function initSchema(): Promise<void> {
  const client = await connect();
  try {
    // The overwhelmingly common case: the database is already at the schema
    // this build expects, so a cold start costs two cheap reads rather than
    // forty DDL statements.
    if ((await recordedHash(client)) === SCHEMA_HASH) return;

    // Cold starts arrive in bursts, and concurrent CREATE TABLE / ALTER TABLE
    // race each other in Postgres — "tuple concurrently updated", duplicate
    // pg_type rows, deadlocks. That is what made one visitor in twenty see
    // "the shop could not load" while everyone else got in. One instance runs
    // the DDL; the rest wait here and then find the hash already recorded.
    await client.query("BEGIN");
    // Bounded, so a wedged lock surfaces as an error the next request can
    // retry instead of hanging until the platform kills the function.
    await client.query("SET LOCAL lock_timeout = '8s'");
    await client.query("SELECT pg_advisory_xact_lock($1)", [SCHEMA_LOCK]);
    if ((await recordedHash(client)) === SCHEMA_HASH) {
      await client.query("ROLLBACK");
      return;
    }
    await client.query(SCHEMA_SQL);
    await client.query(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ('schema_hash', $1, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [SCHEMA_HASH],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
