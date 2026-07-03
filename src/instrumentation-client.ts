// Client-side error monitoring (Sentry). Same rules as the server side:
// dormant without NEXT_PUBLIC_SENTRY_DSN, no PII, no request data, no
// replays — a browser error event is a stack trace, nothing else.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event) {
      delete event.request;
      delete event.user;
      return event;
    },
  });
}

export const onRouterTransitionStart = dsn ? Sentry.captureRouterTransitionStart : () => {};
