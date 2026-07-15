import "server-only";

import { formatDistanceToNow } from "date-fns";

import type { ListingCustomFields, ListingStatus } from "@/db/schema";
import { sortCustomListingFieldsForDisplay } from "@/lib/custom-listing-fields/custom-listing-field-ordering";
import {
  buildListingFeatureDefinitionLookup,
  type ListingFeatureDefinition,
} from "@/lib/listings/listing-feature-definitions";
import type {
  CreateListingInput,
  ListingDetails,
  UpdateListingInput,
} from "@/shared/schemas/listings";

export const DEFAULT_PROPERTY_COUNTRY = "Canada";

type StoredListingFeature = NonNullable<ListingDetails["accessibilityFeatures"]>[number];

export function buildListingCustomFields(
  input: CreateListingInput,
  definitions: ListingFeatureDefinition[],
): ListingCustomFields {
  const customFields: ListingCustomFields = {};

  applyAccessibilityFeatureState(customFields, input.accessibilityFeatures, definitions);

  return customFields;
}

export function mergeListingCustomFields(
  existing: ListingCustomFields,
  input: UpdateListingInput,
  definitions: ListingFeatureDefinition[],
): ListingCustomFields {
  const next = { ...existing };

  if (input.accessibilityFeatures !== undefined) {
    applyAccessibilityFeatureState(next, input.accessibilityFeatures, definitions);
  }

  return next;
}

export function getListingApplicationUrl(applicationUrl: string | null | undefined) {
  return applicationUrl?.trim() || undefined;
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
  const trimmedTitle = title.trim();

  return trimmedTitle ? `Copy of ${trimmedTitle}` : "";
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
  features:
    | CreateListingInput["accessibilityFeatures"]
    | UpdateListingInput["accessibilityFeatures"],
  definitions: ListingFeatureDefinition[],
) {
  const allowedKeys = new Set(definitions.map((definition) => definition.key));

  for (const definition of definitions) {
    delete customFields[definition.key];
  }

  if (!features) {
    return;
  }

  for (const feature of features) {
    if (feature.id && allowedKeys.has(feature.id)) {
      customFields[feature.id] = true;
    }
  }
}

function getResolvedListingFeatureDefinitions(
  customFields: ListingCustomFields,
  definitions: ListingFeatureDefinition[],
) {
  const lookup = buildListingFeatureDefinitionLookup(definitions);
  const resolvedDefinitions = new Map<string, ListingFeatureDefinition>();

  for (const key of getEnabledBooleanCustomFieldKeys(customFields)) {
    const definition = lookup.byKey.get(key);

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
