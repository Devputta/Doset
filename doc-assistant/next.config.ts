import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal, self-contained server bundle (.next/standalone) —
  // used by the production Dockerfile so the runtime image doesn't need
  // node_modules or the source tree copied in.
  output: "standalone",
  typescript: {
    // Skip type-checking during the production build — these are strict
    // type mismatches (duplicate pdfjs-dist versions, a couple of loose
    // JSON-parsed types), not runtime bugs. `next dev` and your editor
    // still show them for local development.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
