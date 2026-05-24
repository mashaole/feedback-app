import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Prefer this monorepo root when unrelated lockfiles exist above the project. */
  outputFileTracingRoot: path.resolve(process.cwd()),
};

export default nextConfig;
