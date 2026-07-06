"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Route-level error boundary. A crash mid-visit must never show a raw stack
// or lose the clinician's bearings: say what happened plainly, offer retry
// (Next re-renders the segment) and a way home. No error details are shown —
// they go to Sentry (when enabled), which is already PHI-scrubbed.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="font-serif text-[22px] font-semibold text-ink">Something went wrong</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-[#6b665a]">
        This screen hit an unexpected error. Your case data is unaffected — notes are only
        changed when you save or sign them.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[12px] text-[#948d7c]">ref {error.digest}</p>
      )}
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-[10px] bg-clinical px-[18px] py-[10px] text-[14px] font-bold text-white shadow-[0_6px_16px_-8px_rgba(78,107,87,.55)]"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-[10px] border border-[#E6E4DB] bg-white px-[18px] py-[10px] text-[14px] font-semibold text-[#5c574a]"
        >
          Your cases
        </a>
      </div>
    </div>
  );
}
