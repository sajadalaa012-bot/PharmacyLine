# Deploying to Vercel (with a real Postgres database)

Architecture now:

- **Orders** → a real **Postgres** database, via server API routes
  (`/api/orders*`). Persistent, shared across devices, admin-protected.
- **Products & categories** → still browser-local (IndexedDB), seeded from the
  bundled catalog. (Not part of the order-system request.)
- **Admin** (`/admin` + order APIs) → protected by a server-side session
  cookie. Storefront browsing + checkout are public.

---

## Step 1 — Create a Postgres database (Neon, free)
1. Go to **https://neon.tech** → sign up → **Create project**.
2. Copy the **connection string**
   (`postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require`).

> Tables are created automatically on first use — no migration step needed.

## Step 2 — Import the repo into Vercel
1. **https://vercel.com** → log in with GitHub → **Add New → Project** → import
   **`PharmacyLine`**.
2. ⚠️ Set **Root Directory** to **`frontend`**.
3. Framework auto-detects **Next.js**. Leave build settings default.

## Step 3 — Environment variables (Settings → Environment Variables)
| Name | Value |
|------|-------|
| `DATABASE_URL` | your Neon connection string |
| `ADMIN_EMAIL` | `pharmacyline@gmail.com` |
| `ADMIN_PASSWORD` | `pharmacyline` |
| `AUTH_SECRET` | a long random string |

> These are **server-only** (no `NEXT_PUBLIC_` prefix), so the password/secret
> never ship to the browser — this is real, server-enforced auth.

## Step 4 — Deploy
Click **Deploy**. First build ~1–2 min. You get a free `…vercel.app` URL.

## Step 5 — Use it
- **Storefront:** open the URL → browse → **Checkout** (enter name, email,
  phone, address, payment method) → **Place Order** → confirmation with an
  order number. "My Orders" (in the cart) shows the customer's own orders +
  live status.
- **Admin:** `/admin` → sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` →
  **Orders** page: search, filter, paginate, open an order, change **order
  status** & **payment status**, or delete.

Every push to GitHub auto-redeploys.

---

## Local development
```powershell
cd frontend
copy .env.example .env.local   # then edit values (use your Neon URL)
npm run dev
```
Open http://localhost:3000 (storefront) and http://localhost:3000/admin.

## Notes
- Product photos uploaded in admin are still stored browser-side (products are
  not in the database yet). Orders and everything in them are fully persisted.
- To wipe orders, drop the `orders` / `order_items` tables in Neon; they'll be
  recreated empty on the next request.
