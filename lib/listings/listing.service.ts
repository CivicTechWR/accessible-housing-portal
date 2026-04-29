import "server-only";

import { asc, desc, type SQL } from "drizzle-orm";

import { listings } from "@/db/schema";
import type { getOptionalSession } from "@/lib/auth/session";
import { getListingImageUrl } from "@/lib/listings/store";
import {
  buildCreateListingGraphInput,
  buildUpdateListingGraphInput,
} from "@/lib/listings/listing-intake";
import {
  buildListingDetailsResponse,
  buildListingEditorData,
  buildListingSummary,
  buildOwnerListingSummary,
} from "@/lib/listings/listing-projection";
import {
  andListingSpecifications,
  listingAccessibilitySpecification,
  listingAvailableBySpecification,
  listingBathroomsAtLeastSpecification,
  listingBathroomsSpecification,
  listingBedroomsAtLeastSpecification,
  listingBedroomsSpecification,
  listingFeatureDefinitionsSpecification,
  listingMinRentSpecification,
  listingMaxRentSpecification,
  listingNeighborhoodSpecification,
  listingOwnerSpecification,
  listingSearchSpecification,
  listingStatusSpecification,
} from "@/lib/listings/listing.specifications";
import {
  archiveListing,
  createDraftListing,
  createListing,
  findListingImagesByListingIds,
  findOwnerListings,
  findListingRecordById,
  findListingSummaries,
  findPublicBooleanFeatureDefinitions,
  updateListingGraph,
} from "@/lib/listings/listing.repository";
import { fail, succeed, type DomainResult } from "@/lib/http/domain-result";
import {
  canEditListing,
  canReadListing,
  canWriteListing,
  getListingListVisibility,
  type ListingActor,
} from "@/lib/policies/listing-policy";
import { getOptionalSession as getAuthSession } from "@/lib/auth/session";
import type {
  CreateListingInput,
  CreateListingResponse,
  CreateDraftListingResponse,
  DeleteListingResponse,
  ListingByIdResponse,
  ListingEditorResponse,
  ListingIdParam,
  ListingListResponse,
  ListingQuery,
  UpdateListingInput,
  UpdateListingResponse,
} from "@/shared/schemas/listings";

type OptionalSessionResult = Awaited<ReturnType<typeof getOptionalSession>>;

export async function getListingsService(query: ListingQuery): Promise<ListingListResponse> {
  const optionalSession =
    query.status === "draft" || query.status === "archived"
      ? await getAuthSession()
      : {
          session: null,
          authzUser: null,
        };

  const actor = toListingActor(optionalSession);
  const page = query.page ? Number(query.page) : 1;
  const limit = query.limit ? Number(query.limit) : 20;
  const visibility = getListingListVisibility(actor, query.status ?? null);
  const search = query.search ?? query.location ?? null;
  const maxRent = query.maxRent ?? query.maxPrice ?? null;
  const selectedFeatures = normalizeQueryFeatures(query.features);
  const bedroomFilter = parseCountFilter(query.bedrooms);
  const bathroomFilter = parseCountFilter(query.bathrooms);

  if (!visibility.isAccessible) {
    return {
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    };
  }

  const publicBooleanDefinitions = await findPublicBooleanFeatureDefinitions();
  const selectedFeatureDefinitions = publicBooleanDefinitions.filter((definition) =>
    selectedFeatures.includes(definition.key),
  );

  const where = andListingSpecifications(
    listingStatusSpecification(visibility.status),
    listingOwnerSpecification(visibility.ownerUserId),
    listingNeighborhoodSpecification(query.neighborhood ?? null),
    bedroomFilter.isAtLeast
      ? listingBedroomsAtLeastSpecification(bedroomFilter.value)
      : listingBedroomsSpecification(bedroomFilter.value),
    bathroomFilter.isAtLeast
      ? listingBathroomsAtLeastSpecification(bathroomFilter.value)
      : listingBathroomsSpecification(bathroomFilter.value),
    listingMinRentSpecification(query.minPrice ?? null),
    listingMaxRentSpecification(maxRent),
    listingAccessibilitySpecification(query.accessibility),
    listingSearchSpecification(search),
    listingAvailableBySpecification(query.moveInDate ?? null),
    listingFeatureDefinitionsSpecification(selectedFeatureDefinitions),
  );

  const { total, rows, imageRows } = await findListingSummaries({
    where,
    page,
    limit,
    orderBy: getListingSortOrder(query.sort),
  });

  const imageByListingId = new Map<string, string>();
  for (const image of imageRows) {
    if (image.listingId && !imageByListingId.has(image.listingId)) {
      imageByListingId.set(image.listingId, getListingImageUrl(image.id, image.imageUrl));
    }
  }

  return {
    data: rows.map((row) =>
      buildListingSummary({
        row,
        imageUrl: imageByListingId.get(row.id),
        publicBooleanDefinitions,
      }),
    ),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

function parseCountFilter(rawValue: string | undefined) {
  if (!rawValue) {
    return {
      isAtLeast: false,
      value: null,
    };
  }

  const isAtLeast = rawValue.endsWith("+");
  const normalized = isAtLeast ? rawValue.slice(0, -1) : rawValue;

  return {
    isAtLeast,
    value: Number.parseInt(normalized, 10),
  };
}

function normalizeQueryFeatures(features: ListingQuery["features"]) {
  if (!features) {
    return [];
  }

  const normalizedFeatures = Array.isArray(features) ? features : features.split(",");

  return normalizedFeatures
    .map((feature) => feature.trim())
    .filter((feature) => feature.length > 0);
}

function getListingSortOrder(sort: ListingQuery["sort"]): SQL<unknown>[] {
  switch (sort) {
    case "oldest":
      return [asc(listings.publishedAt), asc(listings.createdAt)];
    case "price_asc":
      return [asc(listings.monthlyRentCents), desc(listings.publishedAt), desc(listings.createdAt)];
    case "price_desc":
      return [
        desc(listings.monthlyRentCents),
        desc(listings.publishedAt),
        desc(listings.createdAt),
      ];
    case "newest":
    default:
      return [desc(listings.publishedAt), desc(listings.createdAt)];
  }
}

export async function getListingByIdService(
  listingId: ListingIdParam,
): Promise<DomainResult<ListingByIdResponse>> {
  const optionalSession = await getAuthSession();
  const actor = toListingActor(optionalSession);
  const listing = await findListingRecordById(listingId);

  if (!listing) {
    return fail("not_found", "Listing not found");
  }

  if (
    !canReadListing(
      {
        ownerUserId: listing.property.ownerUserId,
        status: listing.status,
      },
      actor,
    )
  ) {
    return fail("not_found", "Listing not found");
  }

  const details = await buildListingDetailsResponse(listing);

  return succeed({
    data: {
      ...details,
      editUrl:
        actor.userId === listing.property.ownerUserId ? `/listing-form/${listing.id}` : undefined,
    },
  });
}

export async function getListingEditorByIdService(
  listingId: ListingIdParam,
): Promise<DomainResult<ListingEditorResponse>> {
  const actorResult = await requireListingWriteActor();

  if (!actorResult.ok) {
    return actorResult;
  }

  const listing = await findListingRecordById(listingId);

  if (!listing) {
    return fail("not_found", "Listing not found");
  }

  if (
    !canEditListing(
      {
        ownerUserId: listing.property.ownerUserId,
        status: listing.status,
      },
      actorResult.value.actor,
    )
  ) {
    return fail("forbidden", "Forbidden");
  }

  const data = await buildListingEditorData(listing);

  return succeed({
    data: {
      id: listing.id,
      ...data,
    },
  });
}

export async function createDraftListingService(): Promise<
  DomainResult<CreateDraftListingResponse>
> {
  const actorResult = await requireListingWriteActor();

  if (!actorResult.ok) {
    return actorResult;
  }

  const listing = await createDraftListing({
    actorUserId: actorResult.value.actor.userId,
  });

  return succeed({
    message: "Draft listing created",
    data: {
      id: listing.id,
    },
  });
}

export async function getMyListingsService(): Promise<
  DomainResult<{
    data: Array<{
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
    }>;
  }>
> {
  const actorResult = await requireListingWriteActor();

  if (!actorResult.ok) {
    return actorResult;
  }

  const rows = await findOwnerListings(actorResult.value.actor.userId);
  const listingIds = rows.map((row) => row.id);
  const imageRows = await findListingImagesByListingIds(listingIds);
  const imageByListingId = new Map<string, string>();

  for (const image of imageRows) {
    if (image.listingId && !imageByListingId.has(image.listingId)) {
      imageByListingId.set(image.listingId, getListingImageUrl(image.id, image.imageUrl));
    }
  }

  return succeed({
    data: rows.map((row) =>
      buildOwnerListingSummary({
        row,
        imageUrl: imageByListingId.get(row.id),
      }),
    ),
  });
}

export async function createListingService(
  payload: CreateListingInput,
): Promise<DomainResult<CreateListingResponse>> {
  const actorResult = await requireListingWriteActor();

  if (!actorResult.ok) {
    return actorResult;
  }

  const createdListing = await createListing(
    buildCreateListingGraphInput({
      actorUserId: actorResult.value.actor.userId,
      payload,
    }),
  );

  return succeed({
    message: "Listing created",
    data: {
      id: createdListing.id,
      ...payload,
    },
  });
}

export async function updateListingByIdService(input: {
  listingId: ListingIdParam;
  payload: UpdateListingInput;
}): Promise<DomainResult<UpdateListingResponse>> {
  const actorResult = await requireListingWriteActor();

  if (!actorResult.ok) {
    return actorResult;
  }

  const listing = await findListingRecordById(input.listingId);

  if (!listing) {
    return fail("not_found", "Listing not found");
  }

  if (
    !canEditListing(
      {
        ownerUserId: listing.property.ownerUserId,
        status: listing.status,
      },
      actorResult.value.actor,
    )
  ) {
    return fail("forbidden", "Forbidden");
  }

  const updateGraphInput = buildUpdateListingGraphInput({
    actorUserId: actorResult.value.actor.userId,
    listingId: input.listingId,
    listing,
    payload: input.payload,
  });

  if (!updateGraphInput.ok) {
    return updateGraphInput;
  }

  await updateListingGraph(updateGraphInput.value);

  return succeed({
    message: "Listing updated",
    data: {
      id: input.listingId,
      ...input.payload,
    },
  });
}

export async function deleteListingByIdService(
  listingId: ListingIdParam,
): Promise<DomainResult<DeleteListingResponse>> {
  const actorResult = await requireListingWriteActor();

  if (!actorResult.ok) {
    return actorResult;
  }

  const listing = await findListingRecordById(listingId);

  if (!listing) {
    return fail("not_found", "Listing not found");
  }

  if (
    !canEditListing(
      {
        ownerUserId: listing.property.ownerUserId,
        status: listing.status,
      },
      actorResult.value.actor,
    )
  ) {
    return fail("forbidden", "Forbidden");
  }

  await archiveListing({
    listingId,
    publishedAt: listing.publishedAt,
    actorUserId: actorResult.value.actor.userId,
  });

  return succeed({
    message: "Listing deleted",
    data: {
      id: listingId,
    },
  });
}

async function requireListingWriteActor(): Promise<
  DomainResult<{
    actor: {
      userId: string;
      role: Exclude<ListingActor["role"], null>;
    };
  }>
> {
  const optionalSession = await getAuthSession();

  if (!optionalSession.session || !optionalSession.authzUser) {
    return fail("unauthorized", "Unauthorized");
  }

  const actor = {
    userId: optionalSession.session.user.id,
    role: optionalSession.authzUser.role,
  };

  if (!canWriteListing(actor)) {
    return fail("forbidden", "Forbidden");
  }

  return succeed({
    actor: {
      userId: actor.userId,
      role: actor.role,
    },
  });
}

function toListingActor(optionalSession: OptionalSessionResult): ListingActor {
  if (!optionalSession.session || !optionalSession.authzUser) {
    return {
      userId: null,
      role: null,
    };
  }

  return {
    userId: optionalSession.session.user.id,
    role: optionalSession.authzUser.role,
  };
}
