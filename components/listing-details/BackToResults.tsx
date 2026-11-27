"use client";

import { useEffect, useState } from "react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
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
 * Links back to the search page, with the filters the reader last used there. `iconOnly` is the
 * 40px round button that sits over the first photo on phones, with a 44px touch target.
 */
export function BackToResults({
  className,
  iconOnly = false,
}: {
  className?: string;
  iconOnly?: boolean;
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

  if (iconOnly) {
    return (
      <Link
        href={href}
        aria-label="Back to results"
        className={cn(
          "flex size-10 items-center justify-center rounded-full border bg-card/90 text-foreground shadow-md outline-none after:absolute after:-inset-0.5 focus-visible:ring-3 focus-visible:ring-ring/60 dark:border-white/15",
          className,
        )}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-5" aria-hidden />
      </Link>
    );
  }

  return (
    <BackLink href={href} className={className}>
      Back to results
    </BackLink>
  );
}
