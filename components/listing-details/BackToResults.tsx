"use client";

import { useEffect, useState } from "react";
import { BackLink } from "@/components/ui/back-link";

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

/** Links back to the search page, with the filters the reader last used there. */
export function BackToResults({ className }: { className?: string }) {
  const [href, setHref] = useState("/listings");
  useEffect(() => {
    try {
      const search = sessionStorage.getItem(LAST_SEARCH_STORAGE_KEY);
      if (search?.startsWith("?")) setHref(`/listings${search}`);
    } catch {
      // Storage can be blocked; keep the unfiltered search.
    }
  }, []);

  return (
    <BackLink href={href} className={className}>
      Back to results
    </BackLink>
  );
}
