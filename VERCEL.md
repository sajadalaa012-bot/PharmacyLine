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

## Step 3 — Set the admin login ⚠️
Under **Environment Variables**, add:

| Name | Value |
|------|-------|
| `ADMIN_EMAIL` | the email you'll sign in with |
| `ADMIN_PASSWORD` | a password |
| `AUTH_SECRET` | *(optional)* a long random string used to sign session tokens |

> **If you set up this project before orders moved to a database, check these
> names.** The variables used to be called `NEXT_PUBLIC_ADMIN_EMAIL` and
> `NEXT_PUBLIC_ADMIN_PASSWORD`. Auth is now enforced on the server, which reads
> the names above. The old names are still honoured so existing deployments
> keep working, but **rename them** — anything prefixed `NEXT_PUBLIC_` is
> compiled into the JavaScript sent to every visitor.

> If neither name is set, the app falls back to credentials hardcoded in
> `frontend/src/lib/serverAuth.ts` — which are visible to anyone who can see
> this repository. The login screen shows a warning when that is the case.

Set `AUTH_SECRET` if you want to be able to change the password without
signing everyone out: session tokens are signed with `AUTH_SECRET` when
present, and with `ADMIN_PASSWORD` otherwise.

## Step 4 — Deploy
- Click **Deploy**. First build takes ~1–2 min.
- You get a free URL like `https://pharmacy-line.vercel.app`.

## Step 5 — Use it
- **Storefront:** open the URL — products load instantly (public, no login).
- **Admin:** go to `/admin` → sign in with your `ADMIN_EMAIL` +
  `ADMIN_PASSWORD`.
- **Language:** the storefront and back office are bilingual — use the
  `العربية` / `EN` button in the header (admin: bottom of the side rail) to
  switch. The choice is remembered per browser; first-time visitors get Arabic
  automatically if that is their browser's language.

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
