import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The preview host and 127.0.0.1 both load this dev server. Without
  // them Next blocks the client bundle, so the map never mounts.
  allowedDevOrigins: ["127.0.0.1", "localhost", "*.agent.cvm.dev"],
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
