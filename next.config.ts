import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let the browser on this LAN address receive hot-reload updates in `npm run dev`.
  allowedDevOrigins: ["192.168.50.214"],
  /* config options here */
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
