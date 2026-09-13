import { connection } from "next/server";
import { redirect } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import ListingsSkeleton from "@/components/listings-skeleton/ListingsSkeleton";
import { Suspense } from "react";
import { getOptionalSession } from "@/lib/auth/session";
import { getListingsService } from "@/lib/listings/listing.service";

import ListingsDashboard from "./listings";
import { getListingsDashboardData } from "./data";
import { createListingsQueryString, getListingsQueryFromSearchParams } from "./query";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = getListingsQueryFromSearchParams({
    ...resolvedSearchParams,
    limit: resolvedSearchParams.limit ?? "50",
    sort: resolvedSearchParams.sort ?? "newest",
  });

  await connection();

  const { session, authzUser } = await getOptionalSession();

  if (!session || !authzUser) {
    redirect("/sign-in?callbackUrl=/listings");
  }

  const [listingsResult, { dynamicGroups }] = await Promise.all([
    getListingsService(query),
    getListingsDashboardData(),
  ]);

  if (!listingsResult.ok) {
    redirect("/sign-in?callbackUrl=/listings");
  }

  const initialData = listingsResult.value;

  return (
    <NuqsAdapter>
      <Suspense fallback={<ListingsSkeleton />}>
        <ListingsDashboard
          initialData={initialData}
          initialQueryString={createListingsQueryString(query)}
          dynamicGroups={dynamicGroups}
        />
      </Suspense>
    </NuqsAdapter>
  );
}
