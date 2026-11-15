import { connection } from "next/server";
import { redirect } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import ListingsSkeleton from "@/components/listings-skeleton/ListingsSkeleton";
import { Suspense } from "react";
import { getOptionalSession } from "@/lib/auth/session";
import { getListingsService } from "@/lib/listings/listing.service";

import ListingsDashboard from "./listings";
import { getListingsDashboardData } from "./data";
import {
  createListingsQueryString,
  getListingsQueryFromSearchParams,
  LISTINGS_PAGE_SIZE,
} from "./query";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = getListingsQueryFromSearchParams({
    ...resolvedSearchParams,
    sort: resolvedSearchParams.sort ?? "newest",
  });

  await connection();

  const { session, authzUser } = await getOptionalSession();

  if (!session || !authzUser) {
    redirect("/sign-in?callbackUrl=/listings");
  }

  const [listingsResult, { dynamicGroups }] = await Promise.all([
    // The first page of the client's infinite query, so it can seed the cache.
    getListingsService({ ...query, page: "1", limit: String(LISTINGS_PAGE_SIZE) }),
    getListingsDashboardData(),
  ]);

  if (!listingsResult.ok) {
    redirect("/sign-in?callbackUrl=/listings");
  }

  const initialData = listingsResult.value;
  const initialDataUpdatedAt = Date.now();

  return (
    <NuqsAdapter>
      {/* Hide the site footer on mobile so the search results get the full screen (#494). */}
      <div data-hide-site-footer-mobile hidden />
      <Suspense fallback={<ListingsSkeleton />}>
        <ListingsDashboard
          initialData={initialData}
          initialQueryString={createListingsQueryString(query)}
          initialDataUpdatedAt={initialDataUpdatedAt}
          dynamicGroups={dynamicGroups}
        />
      </Suspense>
    </NuqsAdapter>
  );
}
