# Deploying Pharmacy Line (going live)

The app now runs as **one service**: the FastAPI backend serves the API, the
uploaded images, and the pre-built frontend. It needs **one persistent disk**
for the SQLite database and uploaded images.

Everything is packaged by the `Dockerfile`, so the host just builds and runs
that image.

---

## What you need
- A [Railway](https://railway.app) account (free to start).
- [Git](https://git-scm.com/download/win) installed, and a free GitHub account
  (recommended path). *(Git isn't currently installed on this machine.)*

---

## Step 1 — Put the code on GitHub

From the project folder (`Sajad3laa`), in a terminal:

```powershell
git init
git add .
git commit -m "Pharmacy Line POS"
```

Create an empty repo on github.com (e.g. `pharmacy-line`), then:

```powershell
git remote add origin https://github.com/<your-username>/pharmacy-line.git
git branch -M main
git push -u origin main
```

> The `.gitignore` keeps `node_modules`, the local Python venv, the `.zip`, and
> the local database out of the repo, so the upload is small.

---

## Step 2 — Create the Railway project

1. Go to **railway.app → New Project → Deploy from GitHub repo**.
2. Pick your `pharmacy-line` repo.
3. Railway detects the `Dockerfile` and starts building. (First build takes a
   few minutes — it compiles the frontend and installs Python deps.)

---

## Step 3 — Add a persistent volume (IMPORTANT)

Without this, your database and uploaded images are wiped on every redeploy.

1. In the service, open the **Variables / Settings** area → **+ New Volume**
   (also reachable via right-click on the service → *Add Volume*).
2. Set the **Mount path** to:

   ```
   /data
   ```

That's where the app stores `pos.db` and uploaded images.

---

## Step 4 — Set the password

In the service → **Variables**, add:

| Variable         | Value                                  |
| ---------------- | -------------------------------------- |
| `ADMIN_PASSWORD` | *a strong password you choose*         |
| `AUTH_SECRET`    | *(optional)* a long random string      |

- `ADMIN_PASSWORD` is what you'll type on the login screen.
- `AUTH_SECRET` is optional; set it so existing logins survive a password change.

Railway sets `PORT` automatically — don't add it yourself.

---

## Step 5 — Get your public URL

1. Service → **Settings → Networking → Generate Domain**.
2. Railway gives you a free URL like `https://pharmacy-line-production.up.railway.app`.
3. Open it — you'll see the **login screen**. Enter your `ADMIN_PASSWORD`.

Health check: `https://<your-url>/api/health` should return `{"status":"ok"}`.

---

## Updating the app later

Make changes locally, then:

```powershell
git add .
git commit -m "describe your change"
git push
```

Railway automatically rebuilds and redeploys. Your data on `/data` is preserved.

---

## Notes & caveats
- **Auth is a single shared password** for the whole app (both the storefront and
  the back office). It's a solid first gate. If you later need per-user accounts,
  audit logs, or roles, that's a bigger add — ask and I'll scope it.
- **Prices/totals are still trusted from the client** (see the earlier audit).
  With login in place this is much lower risk, but if untrusted people ever get
  the password, consider server-side total recomputation. I can add that.
- **Free tier:** Railway's free/trial tier is fine to launch. If the service is
  paused for inactivity or you outgrow the credit, a small paid plan keeps it
  always-on. The volume requires the app to stay on one instance (it does).
- **Backups:** your data is the single SQLite file on the volume. To back up,
  download `/data/pos.db` periodically (Railway shell or a volume snapshot).

---

## Alternative: Render
Render works the same way — create a **Web Service** from the repo (Docker),
add a **Disk** mounted at `/data`, set `ADMIN_PASSWORD`. Note Render's persistent
disks require a paid instance type; Railway is the cheaper way to start.

---

## Local development still works
- Backend: `backend/start-backend.bat` (runs on :8000).
- Frontend: `cd frontend; npm run dev` (runs on :3000, proxies `/api` to :8000).

The static-export mode only activates in the Docker build (`NEXT_OUTPUT_EXPORT=1`),
so your normal dev workflow is unchanged.
