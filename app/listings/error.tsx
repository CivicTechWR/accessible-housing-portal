"use client";

import { useEffect } from "react";

export default function ListingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">We couldn't load listings.</h1>
        <p className="text-sm text-muted-foreground">
          Try again in a moment. If the issue keeps happening, there may be a data or network
          problem.
        </p>
      </div>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}
