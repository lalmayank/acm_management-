import type { NextConfig } from "next";

// Dynamically fetch backend URL from environment variables (.env / .env.local)
const rawBackendUrl =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

// Normalize origin (remove trailing /api/v1 and trailing slashes)
const backendOrigin = rawBackendUrl
  .replace(/\/api\/v1\/?$/, "")
  .replace(/\/+$/, "");

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || `${backendOrigin}/api/v1`,
    NEXT_PUBLIC_BACKEND_URL: backendOrigin,
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendOrigin}/api/v1/:path*`,
      },
      {
        source: "/ws/:path*",
        destination: `${backendOrigin}/ws/:path*`,
      },
      {
        source: "/health",
        destination: `${backendOrigin}/health`,
      },
      {
        source: "/docs",
        destination: `${backendOrigin}/docs`,
      },
      {
        source: "/openapi.json",
        destination: `${backendOrigin}/openapi.json`,
      },
    ];
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
