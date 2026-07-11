import type { NextConfig } from "next";

// Browser-only app: no backend, no API proxy. Deploys as a standard Next.js
// app on Vercel. All data lives in the browser (see src/lib/localdb.ts).
const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.103", "192.168.0.103:3000", "localhost:3000"],
};

export default nextConfig;
