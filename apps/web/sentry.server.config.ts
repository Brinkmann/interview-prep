import * as Sentry from "@sentry/nextjs";
import { dataCollection } from "./sentry.privacy";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? "development",
  dataCollection,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    delete event.request?.data;
    return event;
  },
});
