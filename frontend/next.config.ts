import type { NextConfig } from "next";

// Production builds set NEXT_OUTPUT_EXPORT=1 to emit a fully static site
// into `out/`, served by the FastAPI backend on the same origin.
// Local `npm run dev` leaves it unset and keeps the /api dev proxy.
const isExport = process.env.NEXT_OUTPUT_EXPORT === "1";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.103", "192.168.0.103:3000", "localhost:3000"],
  ...(isExport
    ? {
        output: "export" as const,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        async rewrites() {
          return [
            {
              source: "/api/:path*",
              destination: "http://127.0.0.1:8000/api/:path*",
            },
          ];
        },
      }),
};

export default nextConfig;
