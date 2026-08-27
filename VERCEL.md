# Deploying to Vercel

The app is a Next.js frontend on Vercel plus a **Postgres database**. Products,
categories and orders all live in that database, which is what makes the shop
shared: what you edit in `/admin` on one device is what every visitor sees on
theirs, and orders rung up on the shop computer show up on your phone.

> Earlier versions kept the catalog in each visitor's browser (IndexedDB), so
> an admin's edits never left the machine that made them. That is gone —
> `DATABASE_URL` is now required for the storefront to load at all, not just
> for orders.

---

## Step 1 — Import the repo into Vercel
1. Go to **https://vercel.com** → sign up / log in **with GitHub**.
2. **Add New… → Project** → import **`PharmacyLine`**.

## Step 2 — Set the Root Directory ⚠️ (important)
The repo has a `frontend/` folder (and an unused `backend/`). Vercel must build
the frontend:
- In the import screen, find **Root Directory** → click **Edit** → choose
  **`frontend`**.
- Framework preset should auto-detect **Next.js**. Leave build settings default.

## Step 3 — Add a database ⚠️
Any Postgres works — Vercel Postgres, Neon, Supabase, Railway. In the Vercel
project: **Storage → Create Database → Postgres**, or paste a connection string
from elsewhere as the `DATABASE_URL` environment variable.

The tables create themselves on first request. The catalog is seeded once from
`frontend/src/data/catalog.json`; after that **the database is the source of
truth** and editing that JSON file changes nothing.

## Step 4 — Set the environment variables ⚠️

| Name | Value |
|------|-------|
| `DATABASE_URL` | Postgres connection string (required) |
| `ADMIN_EMAIL` | the email you'll sign in with |
| `ADMIN_PASSWORD` | a password |
| `AUTH_SECRET` | *(optional)* a long random string used to sign session tokens |
| `DATABASE_SSL` | *(optional)* `true` / `false` to override SSL detection |

> **If you set up this project before auth moved to the server, check these
> names.** The variables used to be called `NEXT_PUBLIC_ADMIN_EMAIL` and
> `NEXT_PUBLIC_ADMIN_PASSWORD`. The old names are still honoured so existing
> deployments keep working, but **rename them** — anything prefixed
> `NEXT_PUBLIC_` is compiled into the JavaScript sent to every visitor.

> If neither name is set, the app falls back to credentials hardcoded in
> `frontend/src/lib/serverAuth.ts` — which are visible to anyone who can see
> this repository. The login screen shows a warning when that is the case.

Set `AUTH_SECRET` if you want to be able to change the password without
signing everyone out: session tokens are signed with `AUTH_SECRET` when
present, and with `ADMIN_PASSWORD` otherwise.

## Step 5 — Deploy
- Click **Deploy**. First build takes ~1–2 min.
- You get a free URL like `https://pharmacy-line.vercel.app`.

## Step 6 — Use it
- **Storefront:** open the URL — public, no login.
- **Admin:** go to `/admin` → sign in with your `ADMIN_EMAIL` +
  `ADMIN_PASSWORD`. Add a product, then open the storefront on another device
  and reload: it's there.
- **Language:** the storefront and back office are bilingual — use the
  `العربية` / `EN` button in the header (admin: bottom of the side rail) to
  switch. The choice is remembered per browser; first-time visitors get Arabic
  automatically if that is their browser's language.

Every push to GitHub auto-redeploys.

---

## Test it locally first (optional)
```powershell
cd frontend
# point at any Postgres — a free Neon/Supabase database is fine
"DATABASE_URL=postgres://..." | Out-File -Encoding utf8 .env.local
npm run dev
```
Open **http://localhost:3000** — add items to the cart and place an order, then
open **http://localhost:3000/admin** and check the order appears under
**Orders**. Without `DATABASE_URL` the storefront shows a load error.

## Notes
- **Uploaded product photos** are stored as data URLs inside the product row,
  so they follow the product everywhere. The admin downscales each image to
  900px on its longest edge before uploading — a raw phone photo is several
  megabytes and would be sent to every shopper on every page load.
- The seeded product images (`/products/*.jpg`) are bundled and served by Vercel.
- **To reset the catalog** back to `data/catalog.json`, empty the tables and
  reload — this discards every admin edit:
  ```sql
  TRUNCATE products, categories RESTART IDENTITY;
  ```
- Orders placed on a device *before* orders moved to the database are uploaded
  automatically on next visit (see `lib/migrateLocalOrders.ts`). Catalog edits
  made in that era were per-browser and are not recoverable.
- The `backend/`, `Dockerfile`, and `railway.json` files are unused for this
  Vercel deployment — kept only in case you switch back to a hosted backend.
