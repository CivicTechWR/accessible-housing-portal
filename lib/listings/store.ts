import "server-only";

import { formatDistanceToNow } from "date-fns";

import type {
  CustomListingFieldApplicability,
  Listing,
  ListingCustomFields,
  ListingStatus,
  NewListing,
  NewProperty,
  Property,
} from "@/db/schema";
import { sortCustomListingFieldsForDisplay } from "@/lib/custom-listing-fields/custom-listing-field-ordering";
import type { ListingFeatureDefinition } from "@/lib/listings/listing-feature-definitions";
import type {
  ListingDetails,
  ListingDuplicateScope,
  ListingMutationInput,
} from "@/shared/schemas/listings";

export const DEFAULT_PROPERTY_COUNTRY = "Canada";

type StoredListingFeature = NonNullable<ListingDetails["accessibilityFeatures"]>[number];

export function mergeListingCustomFields(
  existing: ListingCustomFields,
  input: ListingMutationInput,
  definitions: ListingFeatureDefinition[],
): ListingCustomFields {
  const next = { ...existing };

  if (input.accessibilityFeatureIds !== undefined) {
    applyAccessibilityFeatureState(next, input.accessibilityFeatureIds, definitions);
  }

  return next;
}

export function getOptionalListingText(value: string | null | undefined) {
  return value?.trim() || undefined;
}

export function getEnabledBooleanCustomFieldKeys(customFields: ListingCustomFields) {
  return Object.entries(customFields)
    .filter(([, value]) => value === true)
    .map(([key]) => key);
}

export function buildListingFeatureCategories(
  customFields: ListingCustomFields,
  definitions: ListingFeatureDefinition[],
): ListingDetails["features"] {
  const categories = new Map<string, ListingDetails["features"][number]>();
  const resolvedDefinitions = getResolvedListingFeatureDefinitions(customFields, definitions);

  for (const definition of resolvedDefinitions) {
    const existingCategory = categories.get(definition.category) ?? {
      categoryName: definition.category,
      features: [],
    };

    existingCategory.features.push({
      name: definition.label,
      description: definition.description ?? definition.label,
    });

    categories.set(definition.category, existingCategory);
  }

  return Array.from(categories.values());
}

export function getDisplayAccessibilityFeatures(
  customFields: ListingCustomFields,
  definitions: ListingFeatureDefinition[],
): StoredListingFeature[] {
  return getResolvedListingFeatureDefinitions(customFields, definitions).map((definition) => ({
    id: definition.key,
    name: definition.label,
    description: definition.description ?? definition.label,
  }));
}

export function formatListingAddress(street1: string, unitNumber: string | null) {
  return unitNumber ? `${street1} #${unitNumber}` : street1;
}

export function buildDuplicateListingTitle(title: string) {
  return title ? `Copy of ${title}` : "";
}

export function selectDuplicateCustomFields(input: {
  customFields: ListingCustomFields;
  applicabilityByKey: Map<string, CustomListingFieldApplicability>;
  scope: Exclude<ListingDuplicateScope, "all">;
}): ListingCustomFields {
  const selected: ListingCustomFields = {};

  for (const [key, value] of Object.entries(input.customFields)) {
    const applicability = input.applicabilityByKey.get(key) ?? "unit";

    if (applicability === input.scope) {
      selected[key] = value;
    }
  }

  return selected;
}

export type DuplicateListingPlan = {
  property: NewProperty;
  listing: Omit<NewListing, "propertyId">;
};

export function buildDuplicateListingPlan(input: {
  source: Listing;
  sourceProperty: Property;
  actorUserId: string;
  title: string;
  scope: ListingDuplicateScope;
  customFields: ListingCustomFields;
}): DuplicateListingPlan {
  // Keep blank values aligned with createDraftListing.
  const copiesBuilding = input.scope !== "unit";
  const copiesUnit = input.scope !== "building";
  const { source, sourceProperty, actorUserId } = input;

  return {
    property: {
      // Preserve the source owner when an admin duplicates on their behalf.
      ownerUserId: sourceProperty.ownerUserId,
      name: copiesBuilding ? sourceProperty.name : "",
      street1: copiesBuilding ? sourceProperty.street1 : "",
      street2: copiesBuilding ? sourceProperty.street2 : null,
      city: copiesBuilding ? sourceProperty.city : "",
      province: copiesBuilding ? sourceProperty.province : "",
      postalCode: copiesBuilding ? sourceProperty.postalCode : "",
      country: copiesBuilding ? sourceProperty.country : DEFAULT_PROPERTY_COUNTRY,
      neighbourhood: copiesBuilding ? sourceProperty.neighbourhood : null,
      latitude: copiesBuilding ? sourceProperty.latitude : null,
      longitude: copiesBuilding ? sourceProperty.longitude : null,
      contactName: copiesBuilding ? sourceProperty.contactName : "",
      contactRole: copiesBuilding ? sourceProperty.contactRole : null,
      contactEmail: copiesBuilding ? sourceProperty.contactEmail : "",
      contactPhone: copiesBuilding ? sourceProperty.contactPhone : "",
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
    },
    listing: {
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
      title: input.title,
      status: "draft",
      // These unit-specific values are likely stale on a copy.
      unitNumber: null,
      availableOn: null,
      description: copiesUnit ? source.description : null,
      bedrooms: copiesUnit ? source.bedrooms : 0,
      bathrooms: copiesUnit ? source.bathrooms : 0,
      squareFeet: copiesUnit ? source.squareFeet : null,
      monthlyRentCents: copiesUnit ? source.monthlyRentCents : 0,
      leaseTermMonths: copiesUnit ? source.leaseTermMonths : null,
      depositInfo: copiesUnit ? source.depositInfo : null,
      heatingType: copiesUnit ? source.heatingType : null,
      utilitiesIncluded: copiesUnit ? source.utilitiesIncluded : [],
      maxIncomeCents: copiesUnit ? source.maxIncomeCents : null,
      buildingType: copiesBuilding ? source.buildingType : null,
      applicationUrl: copiesBuilding ? source.applicationUrl : null,
      applicationEmail: copiesBuilding ? source.applicationEmail : "",
      applicationPhone: copiesBuilding ? source.applicationPhone : "",
      applicationInstructions: copiesBuilding ? source.applicationInstructions : null,
      customFields: input.customFields,
      publishedAt: null,
      archivedAt: null,
    },
  };
}

export function getListingImageUrl(imageId: string, imageUrl: string | null) {
  return imageUrl ?? `/api/image-uploads/${imageId}`;
}

export function formatListingTimeAgo(publishedAt: Date | null, createdAt: Date) {
  return formatDistanceToNow(publishedAt ?? createdAt, {
    addSuffix: true,
  });
}

export function getListingSquareFeet(squareFeet: number | null) {
  return squareFeet ?? 0;
}

function applyAccessibilityFeatureState(
  customFields: ListingCustomFields,
  featureIds: string[],
  definitions: ListingFeatureDefinition[],
) {
  const allowedKeys = new Set(definitions.map((definition) => definition.key));

  for (const definition of definitions) {
    delete customFields[definition.key];
  }

  for (const featureId of featureIds) {
    if (allowedKeys.has(featureId)) {
      customFields[featureId] = true;
    }
  }
}

function getResolvedListingFeatureDefinitions(
  customFields: ListingCustomFields,
  definitions: ListingFeatureDefinition[],
) {
  const definitionsByKey = new Map(definitions.map((definition) => [definition.key, definition]));
  const resolvedDefinitions = new Map<string, ListingFeatureDefinition>();

  for (const key of getEnabledBooleanCustomFieldKeys(customFields)) {
    const definition = definitionsByKey.get(key);

    if (definition) {
      resolvedDefinitions.set(definition.key, definition);
    }
  }

  return sortCustomListingFieldsForDisplay(Array.from(resolvedDefinitions.values()));
}

export function resolveListingStatusTimestamps(
  status: ListingStatus,
  current?: {
    publishedAt: Date | null;
    archivedAt: Date | null;
  },
) {
  const now = new Date();

  if (status === "published") {
    return {
      publishedAt: current?.publishedAt ?? now,
      archivedAt: null,
    };
  }

  if (status === "archived") {
    return {
      publishedAt: current?.publishedAt ?? null,
      archivedAt: current?.archivedAt ?? now,
    };
  }

  return {
    publishedAt: null,
    archivedAt: null,
  };
}

export function centsToDollars(amountInCents: number) {
  return amountInCents / 100;
}

export function dollarsToCents(amount: number | undefined) {
  return amount === undefined ? null : Math.round(amount * 100);
}
