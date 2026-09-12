"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this is where you'd forward to an error-tracking
    // service. The digest (if present) correlates to server logs without
    // exposing the underlying stack trace to the user.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle className="h-7 w-7" strokeWidth={1.5} />
      </div>
      <div>
        <h1 className="font-display text-2xl text-text-primary">Something went wrong</h1>
        <p className="mt-2 max-w-sm text-sm text-text-secondary">
          An unexpected error occurred. You can try again, or head back home if it keeps happening.
          {error.digest && <span className="mt-1 block text-xs text-text-muted">Reference: {error.digest}</span>}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-2"
        >
          Back to home
        </a>
      </div>
    </div>
  );
}
