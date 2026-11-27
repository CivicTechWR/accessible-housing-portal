"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDistance } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/app/query-keys";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Image01Icon } from "@hugeicons/core-free-icons";
import { Card, CardContent } from "@/components/ui/card";
import { AlertBanner } from "@/components/ui/alert-banner";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DuplicateListingDialog,
  type DuplicateListingSelection,
} from "@/app/my-listings/DuplicateListingDialog";
import { ListingActionsMenu } from "@/app/my-listings/ListingActionsMenu";
import { ListingStatusBadge } from "@/app/my-listings/ListingStatusBadge";
import { formatArea, formatBaths, formatBeds, formatRent, RENT_PERIOD } from "@/lib/listing-format";
import { cn } from "@/lib/utils";
import type { DuplicateListingResponse } from "@/shared/schemas/listings";

type MyListingItem = {
  id: string;
  title: string;
  status: "draft" | "published" | "archived";
  price: number;
  address: string;
  city: string;
  unitNumber?: string;
  beds: number;
  baths: number;
  sqft: number | null;
  imageUrl?: string;
  imageCount: number;
  updatedAt: string;
  publishedAt?: string;
  editUrl: string;
  viewUrl: string;
};

type MyListingsClientProps = {
  initialListings: MyListingItem[];
  renderedAt: string;
};

// The listings service fills these in when a draft has no address yet.
const PENDING_ADDRESS = "Address pending";
const PENDING_CITY = "Location pending";

function listingLocation(listing: MyListingItem) {
  const parts = [listing.address, listing.city].filter(
    (part) => part !== PENDING_ADDRESS && part !== PENDING_CITY,
  );
  return parts.length > 0 ? parts.join(", ") : null;
}

/** Rent and rooms as display text, or null for each one a draft hasn't filled in (stored as 0). */
function listingFacts(listing: MyListingItem) {
  const isUnsetDraft = (value: number) => listing.status !== "published" && value === 0;
  const rent = isUnsetDraft(listing.price) ? null : formatRent(listing.price);
  // A real listing always has a bathroom, so 0 baths means the rooms haven't been entered.
  // The parts of formatRooms, kept apart so a unit never wraps away from its number.
  const rooms = isUnsetDraft(listing.baths)
    ? null
    : [
        formatBeds(listing.beds),
        formatBaths(listing.baths),
        listing.sqft !== null ? formatArea(listing.sqft) : null,
      ].filter((fact) => fact !== null);
  return { rent, rooms };
}

export function MyListingsClient({ initialListings, renderedAt }: MyListingsClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => new Date(renderedAt));
  const [duplicateTarget, setDuplicateTarget] = useState<MyListingItem | null>(null);
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
      const isArchive = nextStatus === "archived";
      const response = await fetch(
        isArchive ? `/api/listings/${listingId}/archive` : `/api/listings/${listingId}`,
        {
          method: isArchive ? "POST" : "PATCH",
          headers: isArchive ? undefined : { "content-type": "application/json" },
          body: isArchive ? undefined : JSON.stringify({ status: nextStatus }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(
          payload?.message ??
            (isArchive ? "Unable to archive listing." : "Unable to restore listing."),
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
    mutationFn: async ({
      listingId,
      selection,
    }: {
      listingId: string;
      selection: DuplicateListingSelection;
    }) => {
      const response = await fetch(`/api/listings/${listingId}/duplicate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(selection),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Unable to duplicate listing.");
      }

      const payload = (await response.json()) as DuplicateListingResponse;
      return { id: payload.data.id };
    },
    onSuccess: ({ id }) => {
      setDuplicateTarget(null);
      router.push(`/listing-form/${id}`);
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
      {statusMutation.error ? (
        <AlertBanner variant="error" size="default" className="rounded-lg">
          {getMutationErrorMessage(statusMutation.error)}
        </AlertBanner>
      ) : null}

      <ul className="grid gap-3" aria-label="Your listings">
        {listings.map((listing) => {
          const isArchived = listing.status === "archived";
          const isMutating =
            statusMutation.isPending && statusMutation.variables?.listingId === listing.id;
          const pendingLabel =
            statusMutation.variables?.nextStatus === "archived" ? "Archiving..." : "Restoring...";
          const isDuplicating =
            duplicateMutation.isPending && duplicateMutation.variables?.listingId === listing.id;
          const facts = listingFacts(listing);

          return (
            <li key={listing.id}>
              <Card
                className={cn(
                  // Phones: photo and title side by side, then facts and actions on full-width
                  // rows so the facts line has room. From sm: photo, details, actions in a row.
                  "grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3 p-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:gap-x-5 sm:gap-y-1 sm:p-4",
                  isArchived && "bg-muted/40",
                )}
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/5 sm:row-span-2 sm:self-center">
                  {listing.imageUrl ? (
                    <img
                      src={listing.imageUrl}
                      alt=""
                      className={cn("size-full object-cover", isArchived && "opacity-60")}
                    />
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
                      <HugeiconsIcon
                        icon={Image01Icon}
                        strokeWidth={2}
                        className="size-5"
                        aria-hidden
                      />
                      <span className="text-xs font-medium">No photo</span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 space-y-1 sm:self-end">
                  {/* The chip gets its own line so the title can use the full width to wrap. */}
                  <ListingStatusBadge status={listing.status} className="mb-1.5" />
                  <h2 className="text-base font-semibold text-pretty break-words">
                    {listing.title}
                  </h2>
                  <p className="truncate text-sm text-muted-foreground">
                    {listingLocation(listing) ?? "Address not set"}
                  </p>
                </div>

                <div className="col-span-2 min-w-0 space-y-1 sm:col-span-1 sm:col-start-2 sm:self-start">
                  <p className="text-sm text-foreground">
                    {[
                      facts.rent === null ? (
                        <span key="rent" className="text-muted-foreground">
                          Rent not set
                        </span>
                      ) : (
                        <span key="rent">
                          <span className="font-semibold">{facts.rent}</span>
                          <span className="text-muted-foreground">{RENT_PERIOD}</span>
                        </span>
                      ),
                      ...(facts.rooms ?? [
                        <span key="rooms" className="text-muted-foreground">
                          Rooms not set
                        </span>,
                      ]),
                    ].map((fact, index, all) => (
                      // Each fact keeps its trailing " ·" and never splits, so a wrapped line
                      // starts with a fact rather than a dot or an orphaned unit. The spaces
                      // match the " · " on search cards.
                      <span key={index}>
                        <span className="whitespace-nowrap">
                          {fact}
                          {index < all.length - 1 ? (
                            <span className="text-muted-foreground">
                              <span aria-hidden> ·</span>
                              <span className="sr-only">,</span>
                            </span>
                          ) : null}
                        </span>{" "}
                      </span>
                    ))}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Updated {formatDistance(new Date(listing.updatedAt), now, { addSuffix: true })}
                  </p>
                </div>

                <div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:justify-end sm:self-center">
                  {isArchived ? (
                    <p className="mr-auto text-sm text-muted-foreground sm:mr-2 sm:max-w-48 sm:text-right">
                      This listing is archived and is no longer publicly visible.
                    </p>
                  ) : (
                    <>
                      {listing.status === "published" ? (
                        // Edit leads, but "New listing" holds the page's one filled button, so
                        // Edit is outlined and View drops to ghost. On phones the three
                        // buttons share a row, so View takes the same outline as Edit and "…".
                        <Button
                          asChild
                          variant="ghost"
                          className="max-sm:h-11 max-sm:flex-1 max-sm:border-input max-sm:bg-background max-sm:shadow-xs dark:max-sm:bg-input/10"
                        >
                          <Link href={listing.viewUrl}>View</Link>
                        </Button>
                      ) : null}
                      <Button asChild variant="outline" className="max-sm:h-11 max-sm:flex-1">
                        <Link href={listing.editUrl}>
                          {listing.status === "draft" ? "Resume draft" : "Edit"}
                        </Link>
                      </Button>
                    </>
                  )}
                  <ListingActionsMenu
                    listingTitle={listing.title}
                    isArchived={isArchived}
                    isMutating={isMutating}
                    isDuplicating={isDuplicating}
                    pendingLabel={pendingLabel}
                    onDuplicate={() => {
                      duplicateMutation.reset();
                      setDuplicateTarget(listing);
                    }}
                    onArchive={() =>
                      statusMutation.mutate({ listingId: listing.id, nextStatus: "archived" })
                    }
                    onRestore={() =>
                      statusMutation.mutate({ listingId: listing.id, nextStatus: "draft" })
                    }
                  />
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      {duplicateTarget ? (
        <DuplicateListingDialog
          listing={duplicateTarget}
          isDuplicating={duplicateMutation.isPending}
          errorMessage={
            duplicateMutation.error ? getMutationErrorMessage(duplicateMutation.error) : null
          }
          onCancel={() => {
            duplicateMutation.reset();
            setDuplicateTarget(null);
          }}
          onConfirm={(selection) => {
            duplicateMutation.mutate({ listingId: duplicateTarget.id, selection });
          }}
        />
      ) : null}
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
