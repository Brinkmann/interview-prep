import * as Sentry from "@sentry/nextjs";
import { dataCollection } from "./sentry.privacy";

// No session replay: it would record what candidates type.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
  dataCollection,
  tracesSampleRate: 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
