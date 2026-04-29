import "server-only";

import { formatDistanceToNow } from "date-fns";

import type { ListingCustomFields, ListingCustomFieldValue, ListingStatus } from "@/db/schema";
import { sortCustomListingFieldsForDisplay } from "@/lib/custom-listing-fields/custom-listing-field-ordering";
import {
  buildListingFeatureDefinitionLookup,
  type ListingFeatureDefinition,
  normalizeListingFeatureToken,
} from "@/lib/listings/listing-feature-definitions";
import type {
  CreateListingInput,
  ListingDetails,
  UpdateListingInput,
} from "@/shared/schemas/listings";

export const DEFAULT_PROPERTY_COUNTRY = "Canada";

type ListingApplicationMethod = CreateListingInput["applicationMethod"];

type StoredUnit = {
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  rent?: number;
  availableDate?: string;
};

type StoredEligibilityCriteria = {
  maxIncome?: number | null;
  minAge?: number | null;
  housingType?: string | null;
};

type StoredListingFeature = NonNullable<ListingDetails["accessibilityFeatures"]>[number];

export function buildListingCustomFields(input: CreateListingInput): ListingCustomFields {
  const customFields: ListingCustomFields = {
    units: input.units.map((unit) => ({ ...unit })),
    amenities: [...input.amenities],
    applicationMethod: input.applicationMethod,
    externalApplicationUrl:
      input.applicationMethod === "external_link" ? (input.externalApplicationUrl ?? null) : null,
    eligibilityCriteria: { ...input.eligibilityCriteria },
    ...(input.propertyType ? { propertyType: input.propertyType } : {}),
    ...(input.buildingType ? { buildingType: input.buildingType } : {}),
    ...(input.unitStory !== undefined ? { unitStory: input.unitStory } : {}),
    ...(input.leaseTerm ? { leaseTerm: input.leaseTerm } : {}),
    ...(input.utilitiesIncluded ? { utilitiesIncluded: [...input.utilitiesIncluded] } : {}),
  };

  applyAccessibilityFeatureState(customFields, input.accessibilityFeatures);

  return customFields;
}

export function mergeListingCustomFields(
  existing: ListingCustomFields,
  input: UpdateListingInput,
): ListingCustomFields {
  const next: ListingCustomFields = {
    ...existing,
  };
  const existingUnits = getStoredUnits(existing);

  if (input.units !== undefined) {
    // Unit updates are patch-by-index today, so preserve untouched trailing units.
    next.units = mergeStoredUnits(existingUnits, input.units);
  }

  if (input.amenities !== undefined) {
    next.amenities = [...input.amenities];
  }

  if (input.accessibilityFeatures !== undefined) {
    applyAccessibilityFeatureState(next, input.accessibilityFeatures);
  }

  if (input.applicationMethod !== undefined) {
    next.applicationMethod = input.applicationMethod;
  }

  if (input.externalApplicationUrl !== undefined) {
    next.externalApplicationUrl = input.externalApplicationUrl;
  } else if (input.applicationMethod !== undefined && input.applicationMethod !== "external_link") {
    next.externalApplicationUrl = null;
  }

  if (input.eligibilityCriteria !== undefined) {
    next.eligibilityCriteria = {
      ...getStoredEligibilityCriteria(existing),
      ...input.eligibilityCriteria,
    };
  }

  if (input.propertyType !== undefined) {
    next.propertyType = input.propertyType;
  }

  if (input.buildingType !== undefined) {
    next.buildingType = input.buildingType;
  }

  if (input.unitStory !== undefined) {
    next.unitStory = input.unitStory;
  }

  if (input.leaseTerm !== undefined) {
    next.leaseTerm = input.leaseTerm;
  }

  if (input.utilitiesIncluded !== undefined) {
    next.utilitiesIncluded = [...input.utilitiesIncluded];
  }

  return next;
}

export function getStoredUnits(customFields: ListingCustomFields): StoredUnit[] {
  const value = customFields.units;

  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((unit) => {
    if (!isRecord(unit)) {
      return [];
    }

    return [
      {
        bedrooms: getNumber(unit.bedrooms),
        bathrooms: getNumber(unit.bathrooms),
        sqft: getNumber(unit.sqft),
        rent: getNumber(unit.rent),
        availableDate: getString(unit.availableDate),
      },
    ];
  });
}

export function getStoredEligibilityCriteria(
  customFields: ListingCustomFields,
): StoredEligibilityCriteria {
  const value = customFields.eligibilityCriteria;

  if (!isRecord(value)) {
    return {};
  }

  return {
    maxIncome: getNullableNumber(value.maxIncome),
    minAge: getNullableNumber(value.minAge),
    housingType: getNullableString(value.housingType),
  };
}

export function getStoredStringArray(customFields: ListingCustomFields, key: string): string[] {
  const value = customFields[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

export function getStoredString(customFields: ListingCustomFields, key: string) {
  return getString(customFields[key]);
}

export function getStoredNumber(customFields: ListingCustomFields, key: string) {
  return getNumber(customFields[key]);
}

export function getStoredAccessibilityFeatures(
  customFields: ListingCustomFields,
): StoredListingFeature[] {
  const value = customFields.accessibilityFeatures;

  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (typeof entry === "string" && entry.length > 0) {
      return [
        {
          name: entry,
          description: entry,
        },
      ];
    }

    if (!isRecord(entry)) {
      return [];
    }

    const name = getString(entry.name);

    if (!name) {
      return [];
    }

    return [
      {
        id: getString(entry.id) ?? undefined,
        name,
        description: getString(entry.description) ?? name,
      },
    ];
  });
}

export function getStoredApplicationMethod(
  customFields: ListingCustomFields,
): ListingApplicationMethod | undefined {
  const value = customFields.applicationMethod;

  return value === "internal" || value === "external_link" || value === "paper" ? value : undefined;
}

export function getStoredExternalApplicationUrl(customFields: ListingCustomFields) {
  const value = customFields.externalApplicationUrl;

  if (value === null) {
    return null;
  }

  return typeof value === "string" && value.length > 0 ? value : undefined;
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
  const unresolvedLegacyFeatures = getUnresolvedLegacyAccessibilityFeatures(
    customFields,
    definitions,
  );

  const amenities = getStoredStringArray(customFields, "amenities");
  if (amenities.length > 0) {
    categories.set("Amenities", {
      categoryName: "Amenities",
      features: amenities.map((feature) => ({
        name: feature,
        description: feature,
      })),
    });
  }

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

  if (unresolvedLegacyFeatures.length > 0) {
    const accessibilityCategory = categories.get("Accessibility") ?? {
      categoryName: "Accessibility",
      features: [],
    };

    accessibilityCategory.features.push(
      ...unresolvedLegacyFeatures.map((feature) => ({
        id: feature.id,
        name: feature.name,
        description: feature.description,
      })),
    );

    categories.set("Accessibility", accessibilityCategory);
  }

  return Array.from(categories.values());
}

export function getDisplayAccessibilityFeatures(
  customFields: ListingCustomFields,
  definitions: ListingFeatureDefinition[],
): StoredListingFeature[] {
  const resolvedDefinitions = getResolvedListingFeatureDefinitions(customFields, definitions).map(
    (definition) => ({
      id: definition.key,
      name: definition.label,
      description: definition.description ?? definition.label,
    }),
  );

  return [
    ...resolvedDefinitions,
    ...getUnresolvedLegacyAccessibilityFeatures(customFields, definitions),
  ];
}

export function formatListingAddress(street1: string, unitNumber: string | null) {
  return unitNumber ? `${street1} #${unitNumber}` : street1;
}

export function getListingImageUrl(imageId: string, imageUrl: string | null) {
  return imageUrl ?? `/api/image-uploads/${imageId}`;
}

export function formatListingTimeAgo(publishedAt: Date | null, createdAt: Date) {
  return formatDistanceToNow(publishedAt ?? createdAt, {
    addSuffix: true,
  });
}

export function getListingSquareFeet(squareFeet: number | null, customFields: ListingCustomFields) {
  return squareFeet ?? getStoredUnits(customFields)[0]?.sqft ?? 0;
}

function applyAccessibilityFeatureState(
  customFields: ListingCustomFields,
  features:
    | CreateListingInput["accessibilityFeatures"]
    | UpdateListingInput["accessibilityFeatures"],
) {
  for (const key of getEnabledBooleanCustomFieldKeys(customFields)) {
    delete customFields[key];
  }

  if (!features) {
    delete customFields.accessibilityFeatures;
    return;
  }

  const legacyFeatures: StoredListingFeature[] = [];

  for (const feature of features) {
    if (feature.id) {
      customFields[feature.id] = true;
      continue;
    }

    legacyFeatures.push({
      name: feature.name,
      description: feature.description,
    });
  }

  if (legacyFeatures.length > 0) {
    customFields.accessibilityFeatures = legacyFeatures;
  } else {
    delete customFields.accessibilityFeatures;
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

  for (const feature of getStoredAccessibilityFeatures(customFields)) {
    const definition =
      (feature.id ? lookup.byKey.get(feature.id) : undefined) ??
      lookup.byToken.get(normalizeListingFeatureToken(feature.name));

    if (definition) {
      resolvedDefinitions.set(definition.key, definition);
    }
  }

  return sortCustomListingFieldsForDisplay(Array.from(resolvedDefinitions.values()));
}

function getUnresolvedLegacyAccessibilityFeatures(
  customFields: ListingCustomFields,
  definitions: ListingFeatureDefinition[],
) {
  const lookup = buildListingFeatureDefinitionLookup(definitions);

  return getStoredAccessibilityFeatures(customFields).filter((feature) => {
    if (feature.id && lookup.byKey.has(feature.id)) {
      return false;
    }

    return !lookup.byToken.has(normalizeListingFeatureToken(feature.name));
  });
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

function mergeStoredUnits(
  existing: StoredUnit[],
  updates: NonNullable<UpdateListingInput["units"]>,
) {
  return Array.from({ length: Math.max(existing.length, updates.length) }, (_, index) => {
    const update = updates[index];

    if (!update) {
      return {
        ...existing[index],
      };
    }

    return {
      ...existing[index],
      ...update,
    };
  }).filter((unit) => Object.keys(unit).length > 0);
}

function isRecord(value: ListingCustomFieldValue | unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNumber(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function getNullableNumber(value: unknown) {
  return value === null ? null : getNumber(value);
}

function getString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getNullableString(value: unknown) {
  return value === null ? null : getString(value);
}
