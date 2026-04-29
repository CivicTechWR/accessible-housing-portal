import "server-only";

import type { ListingCustomFields } from "@/db/schema";
import { fail, succeed, type DomainResult } from "@/lib/http/domain-result";
import type {
  CreateListingGraphInput,
  ListingRecord,
  UpdateListingGraphInput,
} from "@/lib/listings/listing.repository";
import {
  buildListingCustomFields,
  dollarsToCents,
  getStoredApplicationMethod,
  getStoredEligibilityCriteria,
  getStoredExternalApplicationUrl,
  getStoredUnits,
  mergeListingCustomFields,
  resolveListingStatusTimestamps,
} from "@/lib/listings/store";
import type {
  CreateListingInput,
  ListingIdParam,
  UpdateListingInput,
} from "@/shared/schemas/listings";

export function buildCreateListingGraphInput(input: {
  actorUserId: string;
  payload: CreateListingInput;
}): CreateListingGraphInput {
  const primaryUnit = input.payload.units[0];
  const statusTimestamps = resolveListingStatusTimestamps(input.payload.status);

  return {
    actorUserId: input.actorUserId,
    payload: input.payload,
    primaryUnitRentCents: Math.round(primaryUnit.rent * 100),
    customFields: buildListingCustomFields(input.payload),
    publishedAt: statusTimestamps.publishedAt,
    archivedAt: statusTimestamps.archivedAt,
  };
}

export function buildUpdateListingGraphInput(input: {
  actorUserId: string;
  listingId: ListingIdParam;
  listing: ListingRecord;
  payload: UpdateListingInput;
}): DomainResult<UpdateListingGraphInput> {
  const nextCustomFields = mergeListingCustomFields(input.listing.customFields, input.payload);
  const nextUnits = getStoredUnits(nextCustomFields);
  const primaryUnit = nextUnits[0];
  const nextEligibility = getStoredEligibilityCriteria(nextCustomFields);
  const nextStatus = input.payload.status ?? input.listing.status;
  const nextApplicationUrlResult = resolveNextApplicationUrl({
    payload: input.payload,
    listingApplicationUrl: input.listing.applicationUrl,
    listingCustomFields: input.listing.customFields,
    nextCustomFields,
  });

  if (!nextApplicationUrlResult.ok) {
    return fail("validation", nextApplicationUrlResult.message);
  }

  const statusTimestamps = resolveListingStatusTimestamps(nextStatus, {
    publishedAt: input.listing.publishedAt,
    archivedAt: input.listing.archivedAt,
  });
  const nextPrimaryUnitRentCents = dollarsToCents(primaryUnit?.rent ?? undefined);
  const monthlyRentCents =
    typeof nextPrimaryUnitRentCents === "number" && Number.isFinite(nextPrimaryUnitRentCents)
      ? nextPrimaryUnitRentCents
      : input.listing.monthlyRentCents;

  return succeed({
    actorUserId: input.actorUserId,
    listingId: input.listingId,
    propertyId: input.listing.property.id,
    property: {
      name: input.payload.name ?? input.listing.property.name,
      street1: input.payload.address?.street ?? input.listing.property.street1,
      street2: input.payload.address?.street2 ?? input.listing.property.street2,
      city: input.payload.address?.city ?? input.listing.property.city,
      province: input.payload.address?.province ?? input.listing.property.province,
      postalCode: input.payload.address?.postalCode ?? input.listing.property.postalCode,
      neighborhood: input.payload.address?.neighborhood ?? input.listing.property.neighborhood,
      latitude: input.payload.address?.latitude ?? input.listing.property.latitude,
      longitude: input.payload.address?.longitude ?? input.listing.property.longitude,
      contactName: input.payload.contact?.name ?? input.listing.property.contactName,
      contactEmail: input.payload.contact?.email ?? input.listing.property.contactEmail,
      contactPhone: input.payload.contact?.phone ?? input.listing.property.contactPhone,
    },
    listing: {
      title: input.payload.title ?? input.listing.title,
      description: input.payload.description ?? input.listing.description,
      status: nextStatus,
      unitNumber:
        input.payload.unitNumber === undefined
          ? input.listing.unitNumber
          : input.payload.unitNumber,
      bedrooms: primaryUnit?.bedrooms ?? input.listing.bedrooms,
      bathrooms: primaryUnit?.bathrooms ?? input.listing.bathrooms,
      squareFeet: primaryUnit?.sqft ?? input.listing.squareFeet,
      monthlyRentCents,
      availableOn: primaryUnit?.availableDate ?? input.listing.availableOn,
      maxIncomeCents:
        nextEligibility.maxIncome === null
          ? null
          : (dollarsToCents(nextEligibility.maxIncome ?? undefined) ??
            input.listing.maxIncomeCents),
      applicationUrl: nextApplicationUrlResult.nextApplicationUrl,
      applicationEmail: input.payload.contact?.email ?? input.listing.applicationEmail,
      applicationPhone: input.payload.contact?.phone ?? input.listing.applicationPhone,
      customFields: nextCustomFields,
      publishedAt: statusTimestamps.publishedAt,
      archivedAt: statusTimestamps.archivedAt,
    },
    images: input.payload.images,
    imageAltTextBase: input.payload.name ?? input.listing.title,
  });
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
