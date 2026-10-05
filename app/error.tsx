"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Route-level error boundary. Before this existed a render crash fell through
 * to Next's built-in page — a bare "Error!" with no way back and, more to the
 * point, nothing in our telemetry tying the crash to a route.
 *
 * PostHog's global handler already captures the throw; what it could not tell
 * us is *where*. Both React errors in production (#418 hydration mismatch,
 * #310 hook-order change) were impossible to place from the minified stack
 * alone. This reports the route, the digest and the error name alongside it.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    void import("posthog-js").then(({ default: posthog }) => {
      // The provider initialises PostHog lazily; if it hasn't yet, the global
      // handler has the throw anyway and we just skip the extra context.
      if (!posthog.__loaded) return;
      posthog.captureException(error, {
        boundary: "route",
        route: pathname,
        digest: error.digest,
        error_name: error.name,
        // Google Translate and similar rewrite text nodes before hydration —
        // the most common real-world cause of React #418.
        page_translated: typeof document !== "undefined"
          && /translated-(ltr|rtl)/.test(document.documentElement.className),
      });
    }).catch(() => {
      /* telemetry is best-effort */
    });
  }, [error, pathname]);

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="te-surface p-8 max-w-md w-full text-center" style={{ borderRadius: "1.5rem" }}>
        <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>
          Щось пішло не так
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Сторінка не змогла відобразитись. Спробуйте ще раз — зазвичай це допомагає.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button type="button" onClick={reset} className="te-pill-btn px-6 py-3 text-sm font-bold">
            Спробувати ще раз
          </button>
          <Link prefetch={false} href="/" className="te-pill-btn px-6 py-3 text-sm font-bold">
            На головну
          </Link>
        </div>
      </div>
    </main>
  );
}
