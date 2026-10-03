import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/operations": ["./db/migrations/**/*.sql", "./src/data/research-catalog.json", "./scripts/operations-store.mjs"],
    "/api/venue-discovery": ["./db/migrations/**/*.sql", "./src/data/research-catalog.json", "./scripts/operations-store.mjs"],
  },
};

export default nextConfig;
