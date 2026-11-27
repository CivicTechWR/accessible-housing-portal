"use client";

import { useEffect } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";
import { AppPageShell } from "@/components/page-shell/AppPageShell";
import { Button } from "@/components/ui/button";

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
    <AppPageShell className="flex items-center justify-center">
      <div className="mx-auto w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-xs sm:p-8">
        <span className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-5" aria-hidden />
        </span>
        <h1 className="text-xl font-semibold sm:text-2xl">We couldn&apos;t load listings</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Try again in a moment. If it keeps happening, there may be a data or network problem.
        </p>
        <div className="mt-6 flex flex-col-reverse justify-center gap-3 sm:flex-row">
          <Button asChild variant="outline">
            <Link href="/">Go home</Link>
          </Button>
          <Button onClick={() => reset()}>Try again</Button>
        </div>
      </div>
    </AppPageShell>
  );
}
