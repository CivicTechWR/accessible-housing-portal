import "server-only";

import { asc, desc, type SQL } from "drizzle-orm";

import { listings, type ListingCustomFields } from "@/db/schema";
import type { getOptionalSession } from "@/lib/auth/session";
import {
  buildListingFeatureDefinitionLookup,
  normalizeListingFeatureToken,
} from "@/lib/listings/listing-feature-definitions";
import {
  buildListingFeatureCategories,
  buildListingCustomFields,
  centsToDollars,
  dollarsToCents,
  formatListingAddress,
  getListingImageUrl,
  formatListingTimeAgo,
  getDisplayAccessibilityFeatures,
  getEnabledBooleanCustomFieldKeys,
  getListingSquareFeet,
  getStoredApplicationMethod,
  getStoredAccessibilityFeatures,
  getStoredEligibilityCriteria,
  getStoredExternalApplicationUrl,
  getStoredNumber,
  getStoredString,
  getStoredStringArray,
  getStoredUnits,
  mergeListingCustomFields,
  resolveListingStatusTimestamps,
} from "@/lib/listings/store";
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
  findListingImagesByListingId,
  findOwnerListings,
  findListingRecordById,
  findListingSummaries,
  findPublicBooleanFeatureDefinitions,
  updateListingGraph,
  type ListingRecord,
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
  ListingDetails,
  ListingEditorData,
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
    data: rows.map((row) => {
      const accessibilityFeatures = getDisplayAccessibilityFeatures(
        row.customFields,
        publicBooleanDefinitions,
      );
      const listingSummary = {
        id: row.id,
        price: centsToDollars(row.monthlyRentCents),
        address: formatListingAddress(row.street1, row.unitNumber),
        city: row.city,
        beds: row.bedrooms,
        baths: row.bathrooms,
        sqft: getListingSquareFeet(row.squareFeet, row.customFields),
        accessibilityFeatures: accessibilityFeatures.length > 0 ? accessibilityFeatures : undefined,
        imageUrl: imageByListingId.get(row.id),
        timeAgo: formatListingTimeAgo(row.publishedAt, row.createdAt),
      };

      if (row.latitude === null || row.longitude === null) {
        return listingSummary;
      }

      return {
        ...listingSummary,
        lat: row.latitude,
        lng: row.longitude,
      };
    }),
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
    data: rows.map((row) => ({
      id: row.id,
      title: row.title || "Untitled draft",
      status: row.status,
      price: centsToDollars(row.monthlyRentCents),
      address: formatListingAddress(row.street1, row.unitNumber) || "Address pending",
      city: row.city || "Location pending",
      beds: row.bedrooms,
      baths: row.bathrooms,
      sqft: getListingSquareFeet(row.squareFeet, row.customFields),
      imageUrl: imageByListingId.get(row.id),
      updatedAt: row.updatedAt.toISOString(),
      publishedAt: row.publishedAt?.toISOString(),
      editUrl: `/listing-form/${row.id}`,
      viewUrl: `/listings/${row.id}`,
    })),
  });
}

export async function createListingService(
  payload: CreateListingInput,
): Promise<DomainResult<CreateListingResponse>> {
  const actorResult = await requireListingWriteActor();

  if (!actorResult.ok) {
    return actorResult;
  }

  const primaryUnit = payload.units[0];
  const primaryUnitRentCents = Math.round(primaryUnit.rent * 100);

  const statusTimestamps = resolveListingStatusTimestamps(payload.status);
  const customFields = buildListingCustomFields(payload);

  const createdListing = await createListing({
    actorUserId: actorResult.value.actor.userId,
    payload,
    primaryUnitRentCents,
    customFields,
    publishedAt: statusTimestamps.publishedAt,
    archivedAt: statusTimestamps.archivedAt,
  });

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

  const nextCustomFields = mergeListingCustomFields(listing.customFields, input.payload);
  const nextUnits = getStoredUnits(nextCustomFields);
  const primaryUnit = nextUnits[0];
  const nextEligibility = getStoredEligibilityCriteria(nextCustomFields);
  const nextStatus = input.payload.status ?? listing.status;
  const nextApplicationUrlResult = resolveNextApplicationUrl({
    payload: input.payload,
    listingApplicationUrl: listing.applicationUrl,
    listingCustomFields: listing.customFields,
    nextCustomFields,
  });

  if (!nextApplicationUrlResult.ok) {
    return fail("validation", nextApplicationUrlResult.message);
  }

  const statusTimestamps = resolveListingStatusTimestamps(nextStatus, {
    publishedAt: listing.publishedAt,
    archivedAt: listing.archivedAt,
  });
  const nextPrimaryUnitRentCents = dollarsToCents(primaryUnit?.rent ?? undefined);
  const monthlyRentCents =
    typeof nextPrimaryUnitRentCents === "number" && Number.isFinite(nextPrimaryUnitRentCents)
      ? nextPrimaryUnitRentCents
      : listing.monthlyRentCents;

  await updateListingGraph({
    actorUserId: actorResult.value.actor.userId,
    listingId: input.listingId,
    propertyId: listing.property.id,
    property: {
      name: input.payload.name ?? listing.property.name,
      street1: input.payload.address?.street ?? listing.property.street1,
      street2: input.payload.address?.street2 ?? listing.property.street2,
      city: input.payload.address?.city ?? listing.property.city,
      province: input.payload.address?.province ?? listing.property.province,
      postalCode: input.payload.address?.postalCode ?? listing.property.postalCode,
      neighborhood: input.payload.address?.neighborhood ?? listing.property.neighborhood,
      latitude: input.payload.address?.latitude ?? listing.property.latitude,
      longitude: input.payload.address?.longitude ?? listing.property.longitude,
      contactName: input.payload.contact?.name ?? listing.property.contactName,
      contactEmail: input.payload.contact?.email ?? listing.property.contactEmail,
      contactPhone: input.payload.contact?.phone ?? listing.property.contactPhone,
    },
    listing: {
      title: input.payload.title ?? listing.title,
      description: input.payload.description ?? listing.description,
      status: nextStatus,
      unitNumber:
        input.payload.unitNumber === undefined ? listing.unitNumber : input.payload.unitNumber,
      bedrooms: primaryUnit?.bedrooms ?? listing.bedrooms,
      bathrooms: primaryUnit?.bathrooms ?? listing.bathrooms,
      squareFeet: primaryUnit?.sqft ?? listing.squareFeet,
      monthlyRentCents,
      availableOn: primaryUnit?.availableDate ?? listing.availableOn,
      maxIncomeCents:
        nextEligibility.maxIncome === null
          ? null
          : (dollarsToCents(nextEligibility.maxIncome ?? undefined) ?? listing.maxIncomeCents),
      applicationUrl: nextApplicationUrlResult.nextApplicationUrl,
      applicationEmail: input.payload.contact?.email ?? listing.applicationEmail,
      applicationPhone: input.payload.contact?.phone ?? listing.applicationPhone,
      customFields: nextCustomFields,
      publishedAt: statusTimestamps.publishedAt,
      archivedAt: statusTimestamps.archivedAt,
    },
    images: input.payload.images,
    imageAltTextBase: input.payload.name ?? listing.title,
  });

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

async function buildListingDetailsResponse(listing: ListingRecord): Promise<ListingDetails> {
  const imageRows = await findListingImagesByListingId(listing.id);
  const featureDefinitions = await findPublicBooleanFeatureDefinitions();

  return {
    id: listing.id,
    title: listing.title,
    unitNumber: listing.unitNumber ?? undefined,
    price: centsToDollars(listing.monthlyRentCents),
    address: {
      street1: listing.property.street1,
      street2: listing.property.street2 ?? undefined,
      city: listing.property.city,
      province: listing.property.province,
      postalCode: listing.property.postalCode,
    },
    beds: listing.bedrooms,
    baths: listing.bathrooms,
    sqft: getListingSquareFeet(listing.squareFeet, listing.customFields),
    accessibilityFeatures: getDisplayAccessibilityFeatures(
      listing.customFields,
      featureDefinitions,
    ),
    images: imageRows.map((image) => ({
      url: getListingImageUrl(image.id, image.imageUrl),
      caption: image.altText ?? `${listing.title} image`,
    })),
    timeAgo: formatListingTimeAgo(listing.publishedAt, listing.createdAt),
    features: buildListingFeatureCategories(listing.customFields, featureDefinitions),
    contact:
      listing.property.contactName && listing.property.contactEmail && listing.property.contactPhone
        ? {
            name: listing.property.contactName,
            email: listing.property.contactEmail,
            phone: listing.property.contactPhone,
          }
        : undefined,
  };
}

async function buildListingEditorData(listing: ListingRecord): Promise<ListingEditorData> {
  const imageRows = await findListingImagesByListingId(listing.id);
  const storedUnits = getStoredUnits(listing.customFields);
  const primaryUnit = storedUnits[0];
  const enabledDefinitionKeys = getEnabledBooleanCustomFieldKeys(listing.customFields);
  const publicBooleanDefinitions = await findPublicBooleanFeatureDefinitions();
  const featureDefinitionLookup = buildListingFeatureDefinitionLookup(publicBooleanDefinitions);
  const customFeatures = new Map<string, ListingEditorData["customFeatures"][number]>();

  for (const key of enabledDefinitionKeys) {
    const definition = featureDefinitionLookup.byKey.get(key);

    if (!definition) {
      continue;
    }

    customFeatures.set(definition.key, {
      category: definition.category,
      id: definition.key,
      name: definition.label,
      description: definition.description ?? definition.label,
    });
  }

  for (const feature of getStoredAccessibilityFeatures(listing.customFields)) {
    const definition =
      (feature.id ? featureDefinitionLookup.byKey.get(feature.id) : undefined) ??
      featureDefinitionLookup.byToken.get(normalizeListingFeatureToken(feature.name));
    const featureId = definition?.key ?? slugifyFeatureName(feature.name);

    if (!customFeatures.has(featureId)) {
      customFeatures.set(featureId, {
        category: definition?.category ?? "Accessibility",
        id: featureId,
        name: definition?.label ?? feature.name,
        description: definition?.description ?? feature.description,
      });
    }
  }

  return {
    title: listing.title,
    description: listing.description ?? "",
    propertyType: getStoredString(listing.customFields, "propertyType") ?? "",
    buildingType: getStoredString(listing.customFields, "buildingType") ?? "",
    unitStory: getStoredNumber(listing.customFields, "unitStory"),
    bedrooms: primaryUnit?.bedrooms ?? listing.bedrooms,
    bathrooms: primaryUnit?.bathrooms ?? listing.bathrooms,
    squareFeet: primaryUnit?.sqft ?? listing.squareFeet ?? undefined,
    monthlyRentCents: listing.monthlyRentCents,
    leaseTerm: getStoredString(listing.customFields, "leaseTerm") ?? "",
    utilitiesIncluded: getStoredStringArray(listing.customFields, "utilitiesIncluded"),
    images: imageRows.map((image) => ({
      id: image.id,
      url: getListingImageUrl(image.id, image.imageUrl),
      caption: image.altText ?? "",
    })),
    availableOn: primaryUnit?.availableDate ?? listing.availableOn ?? undefined,
    status: listing.status,
    unitNumber: listing.unitNumber ?? undefined,
    name: listing.property.name,
    street1: listing.property.street1,
    street2: listing.property.street2 ?? undefined,
    city: listing.property.city,
    province: listing.property.province,
    postalCode: listing.property.postalCode,
    contactName: listing.property.contactName ?? "",
    contactEmail: listing.property.contactEmail ?? "",
    contactPhone: listing.property.contactPhone ?? "",
    customFeatures: Array.from(customFeatures.values()),
  };
}

function resolveNextApplicationUrl(input: {
  payload: UpdateListingInput;
  listingApplicationUrl: string | null;
  listingCustomFields: ListingCustomFields;
  nextCustomFields: ListingCustomFields;
}) {
  const effectiveApplicationMethod =
    getStoredApplicationMethod(input.nextCustomFields) ??
    getStoredApplicationMethod(input.listingCustomFields) ??
    (input.listingApplicationUrl ? "external_link" : "internal");
  const hasExplicitExternalApplicationUrlUpdate =
    input.payload.externalApplicationUrl !== undefined;

  if (effectiveApplicationMethod !== "external_link") {
    input.nextCustomFields.externalApplicationUrl = null;
  }

  const nextExternalApplicationUrl = getStoredExternalApplicationUrl(input.nextCustomFields);
  const nextApplicationUrl =
    effectiveApplicationMethod === "external_link"
      ? hasExplicitExternalApplicationUrlUpdate
        ? (nextExternalApplicationUrl ?? null)
        : nextExternalApplicationUrl === undefined
          ? input.listingApplicationUrl
          : nextExternalApplicationUrl
      : null;

  if (effectiveApplicationMethod === "external_link" && !nextApplicationUrl) {
    return {
      ok: false as const,
      message: "External application URL is required when applicationMethod is external_link.",
    };
  }

  return {
    ok: true as const,
    nextApplicationUrl,
  };
}

function slugifyFeatureName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
