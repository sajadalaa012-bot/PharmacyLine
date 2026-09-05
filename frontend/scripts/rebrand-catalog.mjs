// One-off: rebrands AL-MASA to velina in the live catalog's product copy.
//
// data/catalog.json only seeds an empty database (see seedCatalog in
// lib/catalog.ts), so rebranding the file leaves rows that were seeded before
// the rename still reading "AL-MASA". This rewrites those rows in place.
//
// It touches nothing else: only the two description columns, only the exact
// brand phrases below, and only where they still occur — a description an
// admin has rewritten by hand keeps whatever they wrote.
//
// Dry run (prints what would change, writes nothing):
//   DATABASE_URL=... node scripts/rebrand-catalog.mjs
// Then, to commit it:
//   DATABASE_URL=... node scripts/rebrand-catalog.mjs --apply
import pg from "pg";

const PHRASES = [
  ["AL-MASA catalog", "velina catalog"],
  ["مكتب الماسة", "فيلينا"],
  ["AL-MASA", "velina"],
];
const COLUMNS = ["description", "description_ar"];

const apply = process.argv.includes("--apply");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: /sslmode=require|neon\.tech|supabase|pooler|render\.com|vercel/.test(
    connectionString,
  )
    ? { rejectUnauthorized: false }
    : undefined,
});
await client.connect();

// REPLACE() chained over the phrases, longest first, so "AL-MASA catalog" is
// matched before the bare "AL-MASA" inside it.
const rewrite = (col) =>
  PHRASES.reduce(
    (expr, _pair, i) =>
      `REPLACE(${expr}, $${i * 2 + 1}, $${i * 2 + 2})`,
    col,
  );
const params = PHRASES.flat();
const stale = COLUMNS.map((c) => `${c} <> ${rewrite(c)}`).join(" OR ");

try {
  const { rows } = await client.query(
    `SELECT COUNT(*) AS n FROM products WHERE ${stale}`,
    params,
  );
  const n = Number(rows[0].n);
  console.log(`${n} product row(s) still carry the old brand.`);

  if (n === 0) {
    console.log("Nothing to do.");
  } else if (!apply) {
    const sample = await client.query(
      `SELECT id, name, ${COLUMNS.join(", ")} FROM products
        WHERE ${stale} ORDER BY id LIMIT 3`,
      params,
    );
    for (const r of sample.rows) console.log(`\n  #${r.id} ${r.name}\n    ${r.description}\n    ${r.description_ar}`);
    console.log(`\nDry run — nothing written. Re-run with --apply to rewrite ${n} row(s).`);
  } else {
    const set = COLUMNS.map((c) => `${c} = ${rewrite(c)}`).join(", ");
    const res = await client.query(
      `UPDATE products SET ${set} WHERE ${stale}`,
      params,
    );
    console.log(`Rewrote ${res.rowCount} row(s).`);
  }
} finally {
  await client.end();
}
