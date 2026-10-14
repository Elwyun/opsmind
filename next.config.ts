import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server-only packages stay out of the bundler. embedded-postgres ships
  // native PostgreSQL binaries and is only imported by scripts/with-pg.mjs
  // outside the Next.js process.
  serverExternalPackages: ["embedded-postgres"],
};

export default nextConfig;
