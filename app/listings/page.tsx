import { connection } from "next/server";
import { redirect } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import ListingsSkeleton from "@/components/listings-skeleton/ListingsSkeleton";
import { Suspense } from "react";
import { getOptionalSession } from "@/lib/auth/session";
import { getListingsService } from "@/lib/listings/listing.service";
import { listingQuerySchema } from "@/shared/schemas/listings";

import ListingsDashboard from "./listings";
import { getListingsDashboardData } from "./data";
import { createListingsQueryString, LISTINGS_PAGE_SIZE, toListingSearchFilters } from "./query";
import { loadListingSearchParams } from "./searchParams";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const filters = toListingSearchFilters(loadListingSearchParams(resolvedSearchParams));

  await connection();

  const { session, authzUser } = await getOptionalSession();

  if (!session || !authzUser) {
    redirect("/sign-in?callbackUrl=/listings");
  }

  const [listingsResult, { dynamicGroups }] = await Promise.all([
    // The first page of the client's infinite query, so it can seed the cache. The schema check
    // keeps a malformed URL value, such as `bedrooms=abc`, from reaching the database.
    getListingsService(
      listingQuerySchema.parse({ ...filters, page: "1", limit: String(LISTINGS_PAGE_SIZE) }),
    ),
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
          initialQueryString={createListingsQueryString(filters)}
          initialDataUpdatedAt={initialDataUpdatedAt}
          dynamicGroups={dynamicGroups}
        />
      </Suspense>
    </NuqsAdapter>
  );
}
