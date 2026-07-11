# Deploying to Vercel (browser-only)

This app now runs **entirely in the browser** — no backend, no database server.
Products, categories, and orders are stored in the visitor's browser
(IndexedDB), seeded from the bundled catalog. That makes it a perfect fit for
Vercel's static/serverless hosting.

> ⚠️ **Important consequence:** data is **per-browser, per-device**. Orders you
> ring up on the shop computer are **not** visible on your phone or another PC,
> and clearing the browser's site data erases them. This is the tradeoff of
> having "no API". If you later need shared data, tell me and we'll host the
> backend again.

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

## Step 3 — Set the admin login
Under **Environment Variables**, add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_ADMIN_EMAIL` | the email you'll sign in with |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | a password |

> These are baked into the site at build time. Because this is a browser-only
> app, the admin lock is a **convenience gate**, not hard security — anyone
> technical can read the browser data regardless. Don't put sensitive secrets here.

## Step 4 — Deploy
- Click **Deploy**. First build takes ~1–2 min.
- You get a free URL like `https://pharmacy-line.vercel.app`.

## Step 5 — Use it
- **Storefront:** open the URL — products load instantly (public, no login).
- **Admin:** go to `/admin` → sign in with your `NEXT_PUBLIC_ADMIN_EMAIL` +
  `NEXT_PUBLIC_ADMIN_PASSWORD`.

Every push to GitHub auto-redeploys.

---

## Test it locally first (optional, 1 minute)
```powershell
cd frontend
npm run dev
```
Open **http://localhost:3000** — add items to the cart and place an order, then
open **http://localhost:3000/admin** (login `admin@example.com` / `changeme` by
default) and check the order appears under **Orders**.

## Notes
- **Uploaded product photos** are stored inside the browser as data (they work,
  but they live only on the device that uploaded them, like all other data).
- The seeded product images (`/products/*.jpg`) are bundled and served by Vercel.
- To reset a device back to the original catalog: clear the site's data in the
  browser (DevTools → Application → Clear storage), then reload.
- The `backend/`, `Dockerfile`, and `railway.json` files are now unused for this
  Vercel deployment — kept only in case you switch back to a hosted backend.
```
