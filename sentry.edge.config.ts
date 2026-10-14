import * as Sentry from "@sentry/nextjs";

// Edge runtime (middleware, edge routes).

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

// With no DSN, Sentry.init is a no-op and nothing is sent.
Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  tracesSampleRate: 1.0,
});
