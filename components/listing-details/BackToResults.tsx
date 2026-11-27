"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

/** The search page saves its query string here, so "Back to results" returns to the same search. */
export const LAST_SEARCH_STORAGE_KEY = "listings:last-search";

/** Saves the search page's current query string, such as "?bedrooms=2", for `BackToResults`. */
export function rememberListingSearch(queryString: string) {
  try {
    sessionStorage.setItem(LAST_SEARCH_STORAGE_KEY, queryString);
  } catch {
    // Storage can be blocked; the link then goes to an unfiltered search.
  }
}

/**
 * Links back to the search page, with the filters the reader last used there. `overlay` is a round
 * icon button for placing over the photo on phones.
 */
export function BackToResults({
  variant = "link",
  className,
}: {
  variant?: "link" | "overlay";
  className?: string;
}) {
  const [href, setHref] = useState("/listings");
  useEffect(() => {
    try {
      const search = sessionStorage.getItem(LAST_SEARCH_STORAGE_KEY);
      if (search?.startsWith("?")) setHref(`/listings${search}`);
    } catch {
      // Storage can be blocked; keep the unfiltered search.
    }
  }, []);

  if (variant === "overlay") {
    return (
      // A 44px touch target around a 36px visible circle, like the carousel arrows.
      <Link
        href={href}
        aria-label="Back to results"
        className={cn(
          "flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring",
          className,
        )}
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-white/95 text-neutral-900 shadow-md">
          <HugeiconsIcon icon={ArrowLeft02Icon} strokeWidth={2} className="size-5" aria-hidden />
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "-ml-1 inline-flex min-h-11 items-center gap-1.5 self-start rounded-md px-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none",
        className,
      )}
    >
      <HugeiconsIcon icon={ArrowLeft02Icon} strokeWidth={2} className="size-4" aria-hidden />
      Back to results
    </Link>
  );
}
