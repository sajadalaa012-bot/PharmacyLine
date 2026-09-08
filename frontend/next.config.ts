import type { NextConfig } from "next";

/**
 * Point `npm run dev` at the deployed API.
 *
 * The shop's data lives in Postgres behind this app's own /api routes, so a
 * local dev server with no DATABASE_URL cannot load a catalogue, an order or
 * a package. Set DEV_API_ORIGIN in frontend/.env.local to the deployed site
 * and every /api request is proxied there instead:
 *
 *   DEV_API_ORIGIN=https://your-shop.vercel.app
 *
 * A proxy rather than a base URL on the fetch calls, for two reasons. The
 * browser keeps talking to localhost, so there is no cross-origin request to
 * add CORS headers for. And the admin session is an httpOnly, sameSite=lax
 * cookie: sent cross-origin it would simply be dropped, and the back office
 * would never log in. Proxied, the browser sees it as its own cookie.
 *
 * `beforeFiles` is load-bearing. Rewrites in the default group are only tried
 * once the filesystem has been checked, and /api/... matches a real route
 * handler in this app, so an ordinary rewrite would never fire.
 *
 * Development only, and only when the variable is set, so a value left in a
 * production environment by accident cannot make the deployment proxy itself.
 */
function devApiProxy() {
  const origin = process.env.DEV_API_ORIGIN?.trim().replace(/\/+$/, "");
  if (!origin || process.env.NODE_ENV === "production") return [];
  console.log(`[dev] /api/* is proxied to ${origin}`);
  return [{ source: "/api/:path*", destination: `${origin}/api/:path*` }];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.103", "192.168.0.103:3000", "localhost:3000"],
  async rewrites() {
    return { beforeFiles: devApiProxy(), afterFiles: [], fallback: [] };
  },
  /**
   * The service worker must never be served from a cache. It is the file that
   * decides how everything else is cached, so a stale copy of it pins the
   * whole app to an old deploy: the browser would keep handing out yesterday's
   * worker and never notice there is a new one behind it.
   */
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
