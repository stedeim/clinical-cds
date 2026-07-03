// Server-side error monitoring (Sentry), gap #7.
//
// DORMANT WITHOUT A DSN: set SENTRY_DSN to activate — nothing initializes and
// nothing is sent otherwise, so stub-mode demos stay fully offline.
//
// PHI posture, non-negotiable: this app handles patient data, so events are
// scrubbed BEFORE leaving the process — no request bodies, no cookies, no
// headers, no user context. An event is a stack trace and a message, nothing
// else. (And before real PHI in production: Sentry offers a BAA on its
// business plan — sign it or point DSN at a self-hosted instance.)

export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event) {
      // Strip anything request-shaped; PHI must never ride along.
      delete event.request;
      delete event.user;
      if (event.contexts) delete event.contexts.trace;
      return event;
    },
  });
}

export async function onRequestError(...args: unknown[]) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  // @ts-expect-error — passthrough to Sentry's Next.js request-error hook.
  return Sentry.captureRequestError(...args);
}
