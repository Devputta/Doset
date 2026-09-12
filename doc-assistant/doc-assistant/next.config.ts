import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal, self-contained server bundle (.next/standalone) —
  // used by the production Dockerfile so the runtime image doesn't need
  // node_modules or the source tree copied in.
  output: "standalone",
};

export default nextConfig;
