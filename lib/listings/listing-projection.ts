import "server-only";

import {
  buildListingFeatureDefinitionLookup,
  normalizeListingFeatureToken,
} from "@/lib/listings/listing-feature-definitions";
import {
  findListingImagesByListingId,
  findPublicBooleanFeatureDefinitions,
  type ListingRecord,
  type ListingSummaryRow,
  type OwnerListingRow,
} from "@/lib/listings/listing.repository";
import {
  buildListingFeatureCategories,
  centsToDollars,
  formatListingAddress,
  formatListingTimeAgo,
  getDisplayAccessibilityFeatures,
  getEnabledBooleanCustomFieldKeys,
  getListingImageUrl,
  getListingSquareFeet,
  getStoredAccessibilityFeatures,
  getStoredNumber,
  getStoredString,
  getStoredStringArray,
  getStoredUnits,
} from "@/lib/listings/store";
import type { ListingDetails, ListingEditorData, ListingSummary } from "@/shared/schemas/listings";

export function buildListingSummary(input: {
  row: ListingSummaryRow;
  imageUrl?: string;
  publicBooleanDefinitions: Parameters<typeof getDisplayAccessibilityFeatures>[1];
}): ListingSummary {
  const accessibilityFeatures = getDisplayAccessibilityFeatures(
    input.row.customFields,
    input.publicBooleanDefinitions,
  );
  const listingSummary = {
    id: input.row.id,
    price: centsToDollars(input.row.monthlyRentCents),
    address: formatListingAddress(input.row.street1, input.row.unitNumber),
    city: input.row.city,
    beds: input.row.bedrooms,
    baths: input.row.bathrooms,
    sqft: getListingSquareFeet(input.row.squareFeet, input.row.customFields),
    accessibilityFeatures: accessibilityFeatures.length > 0 ? accessibilityFeatures : undefined,
    imageUrl: input.imageUrl,
    timeAgo: formatListingTimeAgo(input.row.publishedAt, input.row.createdAt),
  };

  if (input.row.latitude === null || input.row.longitude === null) {
    return listingSummary;
  }

  return {
    ...listingSummary,
    lat: input.row.latitude,
    lng: input.row.longitude,
  };
}

export function buildOwnerListingSummary(input: { row: OwnerListingRow; imageUrl?: string }) {
  return {
    id: input.row.id,
    title: input.row.title || "Untitled draft",
    status: input.row.status,
    price: centsToDollars(input.row.monthlyRentCents),
    address: formatListingAddress(input.row.street1, input.row.unitNumber) || "Address pending",
    city: input.row.city || "Location pending",
    beds: input.row.bedrooms,
    baths: input.row.bathrooms,
    sqft: getListingSquareFeet(input.row.squareFeet, input.row.customFields),
    imageUrl: input.imageUrl,
    updatedAt: input.row.updatedAt.toISOString(),
    publishedAt: input.row.publishedAt?.toISOString(),
    editUrl: `/listing-form/${input.row.id}`,
    viewUrl: `/listings/${input.row.id}`,
  };
}

export async function buildListingDetailsResponse(listing: ListingRecord): Promise<ListingDetails> {
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

export async function buildListingEditorData(listing: ListingRecord): Promise<ListingEditorData> {
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

function slugifyFeatureName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
