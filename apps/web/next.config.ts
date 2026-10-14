import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@interview-prep/db",
    "@interview-prep/ai",
    "@interview-prep/jobs",
  ],
};

export default withSentryConfig(nextConfig, {
  org: "interview-prep",
  project: "interview-prep-web",
  // Source maps upload only when SENTRY_AUTH_TOKEN is set (Vercel builds).
  silent: !process.env.CI,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
