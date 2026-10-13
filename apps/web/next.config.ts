import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@interview-prep/db",
    "@interview-prep/ai",
    "@interview-prep/jobs",
  ],
};

export default nextConfig;
