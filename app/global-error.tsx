"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: a throw in the root layout itself, where `error.tsx`
 * cannot help because the layout that would wrap it is the thing that failed.
 * It replaces the whole document, so it ships its own <html>/<body> and
 * inline styles — none of the app's CSS is guaranteed to be there.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void import("posthog-js").then(({ default: posthog }) => {
      if (!posthog.__loaded) return;
      posthog.captureException(error, {
        boundary: "global",
        route: typeof location !== "undefined" ? location.pathname : undefined,
        digest: error.digest,
        error_name: error.name,
      });
    }).catch(() => {
      /* telemetry is best-effort */
    });
  }, [error]);

  return (
    <html lang="uk">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#14110f", color: "#f2ece6", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", padding: 24, maxWidth: 420 }}>
          <h1 style={{ fontSize: "1.25rem", margin: "0 0 8px" }}>Щось пішло не так</h1>
          <p style={{ fontSize: "0.9rem", opacity: 0.7, margin: "0 0 24px" }}>
            Сталася помилка під час завантаження сторінки.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ padding: "12px 24px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "inherit", fontWeight: 700, cursor: "pointer" }}
          >
            Спробувати ще раз
          </button>
        </div>
      </body>
    </html>
  );
}
