"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Last-resort boundary: catches errors in the root layout itself, where the
// app shell (and its stylesheet) may not have rendered. Must supply its own
// <html>/<body> and inline styles — nothing else is guaranteed to exist.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F1F0EB",
          fontFamily: "system-ui, sans-serif",
          color: "#2c2a25",
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ font: "600 22px/1.2 Georgia, serif", color: "#211f19", margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#8b8779", margin: "10px 0 0" }}>
            Pabaid hit an unexpected error. Your case data is unaffected — notes are only
            changed when you save or sign them.
          </p>
          {error.digest && (
            <p style={{ font: "400 11px/1 monospace", color: "#bcb7a9", margin: "10px 0 0" }}>
              ref {error.digest}
            </p>
          )}
          <a
            href="/"
            style={{
              display: "inline-block",
              marginTop: 22,
              padding: "10px 18px",
              borderRadius: 10,
              background: "#4E6B57",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Reload Pabaid
          </a>
        </div>
      </body>
    </html>
  );
}
