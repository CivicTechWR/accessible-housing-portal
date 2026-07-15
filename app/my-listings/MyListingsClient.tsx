"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDistance } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/app/query-keys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertBanner } from "@/components/ui/alert-banner";
import { EmptyState } from "@/components/ui/empty-state";

type MyListingItem = {
  id: string;
  title: string;
  status: "draft" | "published" | "archived";
  price: number;
  address: string;
  city: string;
  beds: number;
  baths: number;
  sqft: number;
  imageUrl?: string;
  updatedAt: string;
  publishedAt?: string;
  editUrl: string;
  viewUrl: string;
};

type MyListingsClientProps = {
  initialListings: MyListingItem[];
  renderedAt: string;
};

const statusVariantByLabel = {
  draft: "secondary",
  published: "default",
  archived: "outline",
} as const;

const statusLabelByValue = {
  draft: "Draft",
  published: "Published",
  archived: "Deleted",
} as const;

export function MyListingsClient({ initialListings, renderedAt }: MyListingsClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => new Date(renderedAt));
  const listingsQuery = useQuery({
    queryKey: queryKeys.myListings(),
    queryFn: () => sortListings(initialListings),
    initialData: sortListings(initialListings),
    enabled: false,
  });
  const listings = listingsQuery.data;

  const statusMutation = useMutation({
    mutationFn: async ({
      listingId,
      nextStatus,
    }: {
      listingId: string;
      nextStatus: MyListingItem["status"];
    }) => {
      const isDelete = nextStatus === "archived";
      const response = await fetch(`/api/listings/${listingId}`, {
        method: isDelete ? "DELETE" : "PUT",
        headers: isDelete ? undefined : { "content-type": "application/json" },
        body: isDelete ? undefined : JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(
          payload?.message ??
            (isDelete ? "Unable to delete listing." : "Unable to restore listing."),
        );
      }

      return { listingId, nextStatus };
    },
    onMutate: async ({ listingId, nextStatus }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.myListings() });
      const previousListings = queryClient.getQueryData<MyListingItem[]>(queryKeys.myListings());

      queryClient.setQueryData<MyListingItem[]>(queryKeys.myListings(), (current = []) =>
        sortListings(
          current.map((listing) =>
            listing.id === listingId
              ? {
                  ...listing,
                  status: nextStatus,
                  updatedAt: new Date().toISOString(),
                }
              : listing,
          ),
        ),
      );

      return { previousListings };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousListings) {
        queryClient.setQueryData(queryKeys.myListings(), context.previousListings);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["listings"] });
      router.refresh();
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async ({ listingId }: { listingId: string }) => {
      const response = await fetch(`/api/listings/${listingId}/duplicate`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Unable to duplicate listing.");
      }

      return { listingId };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["listings"] });
      router.refresh();
    },
  });

  useEffect(() => {
    setNow(new Date());

    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    queryClient.setQueryData(queryKeys.myListings(), sortListings(initialListings));
  }, [initialListings, queryClient]);

  if (listings.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState size="spacious" className="border-0">
            No listings yet. Start a draft to begin publishing inventory.
          </EmptyState>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {statusMutation.error || duplicateMutation.error ? (
        <AlertBanner variant="error" size="default" className="rounded-lg">
          {getMutationErrorMessage(statusMutation.error ?? duplicateMutation.error)}
        </AlertBanner>
      ) : null}

      <div className="grid gap-4">
        {listings.map((listing) => {
          const isDeleted = listing.status === "archived";
          const isMutating =
            statusMutation.isPending && statusMutation.variables?.listingId === listing.id;
          const pendingLabel =
            statusMutation.variables?.nextStatus === "archived" ? "Deleting..." : "Restoring...";
          const isDuplicating =
            duplicateMutation.isPending && duplicateMutation.variables?.listingId === listing.id;

          return (
            <Card key={listing.id}>
              <div className="grid gap-4 px-4 md:grid-cols-[220px_1fr]">
                <div className="overflow-hidden rounded-lg bg-muted/30">
                  <div className="h-full min-h-44">
                    {listing.imageUrl ? (
                      <img
                        src={listing.imageUrl}
                        alt={listing.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full min-h-44 items-center justify-center text-sm text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex min-h-44 flex-col">
                  <CardHeader className="flex flex-row items-start justify-between gap-6 px-0">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <CardTitle className="text-xl font-semibold tracking-tight">
                          {listing.title}
                        </CardTitle>
                        <Badge variant={statusVariantByLabel[listing.status]}>
                          {statusLabelByValue[listing.status]}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {listing.address}, {listing.city}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Updated{" "}
                        {formatDistance(new Date(listing.updatedAt), now, { addSuffix: true })}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        ${listing.price.toLocaleString("en-CA")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {listing.beds} bd • {listing.baths} ba • {listing.sqft} sqft
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="mt-auto flex flex-wrap items-center justify-end gap-3 px-0 pt-4">
                    {!isDeleted ? (
                      <>
                        {listing.status === "published" ? (
                          <Button asChild variant="outline">
                            <Link href={listing.viewUrl}>View listing</Link>
                          </Button>
                        ) : null}
                        <Button asChild>
                          <Link href={listing.editUrl}>
                            {listing.status === "draft" ? "Resume draft" : "Edit listing"}
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isDuplicating}
                          onClick={() => {
                            duplicateMutation.mutate({ listingId: listing.id });
                          }}
                        >
                          {isDuplicating ? "Duplicating..." : "Duplicate"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isMutating}
                          onClick={() => {
                            if (
                              window.confirm(
                                "Delete this listing? It will be kept in a deleted state and can be recovered later from the database if needed.",
                              )
                            ) {
                              statusMutation.mutate({
                                listingId: listing.id,
                                nextStatus: "archived",
                              });
                            }
                          }}
                        >
                          {isMutating ? pendingLabel : "Delete"}
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          This listing is in a deleted state and is no longer publicly visible.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isMutating}
                          onClick={() =>
                            statusMutation.mutate({
                              listingId: listing.id,
                              nextStatus: "draft",
                            })
                          }
                        >
                          {isMutating ? pendingLabel : "Undelete"}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function getMutationErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to update listing. Please try again.";
}

function sortListings(listings: MyListingItem[]) {
  return [...listings].sort((left, right) => {
    if (left.status === "archived" && right.status !== "archived") {
      return 1;
    }

    if (left.status !== "archived" && right.status === "archived") {
      return -1;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}
