import "server-only";

import { and, asc, desc, eq, inArray, notInArray, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import {
  customListingFields,
  listingImages,
  listings,
  properties,
  type ListingCustomFields,
  type ListingBuildingType,
  type ListingStatus,
  type UtilityIncluded,
} from "@/db/schema";
import { DEFAULT_PROPERTY_COUNTRY } from "@/lib/listings/store";
import type {
  CreateListingInput,
  ListingIdParam,
  UpdateListingInput,
} from "@/shared/schemas/listings";

export type ListingSummaryRow = {
  id: string;
  monthlyRentCents: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number | null;
  customFields: ListingCustomFields;
  unitNumber: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  street1: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
};

export type ListingRecord = {
  id: string;
  title: string;
  description: string | null;
  status: ListingStatus;
  unitNumber: string | null;
  buildingType: ListingBuildingType | null;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number | null;
  monthlyRentCents: number;
  availableOn: string | null;
  leaseTermMonths: number | null;
  utilitiesIncluded: UtilityIncluded[];
  maxIncomeCents: number | null;
  applicationUrl: string | null;
  applicationEmail: string | null;
  applicationPhone: string | null;
  customFields: ListingCustomFields;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  property: {
    id: string;
    ownerUserId: string;
    name: string;
    street1: string;
    street2: string | null;
    city: string;
    province: string;
    postalCode: string;
    neighborhood: string | null;
    latitude: number | null;
    longitude: number | null;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
  };
};

export type OwnerListingRow = {
  id: string;
  title: string;
  status: ListingStatus;
  monthlyRentCents: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number | null;
  customFields: ListingCustomFields;
  unitNumber: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  street1: string;
  city: string;
};

export async function findListingSummaries(input: {
  where?: SQL<unknown>;
  page: number;
  limit: number;
  orderBy?: SQL<unknown>[];
}) {
  const offset = (input.page - 1) * input.limit;

  const totalRows = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(listings)
    .innerJoin(properties, eq(listings.propertyId, properties.id))
    .where(input.where);
  const total = Number(totalRows[0]?.total ?? 0);

  const rows = await db
    .select({
      id: listings.id,
      monthlyRentCents: listings.monthlyRentCents,
      bedrooms: listings.bedrooms,
      bathrooms: listings.bathrooms,
      squareFeet: listings.squareFeet,
      customFields: listings.customFields,
      unitNumber: listings.unitNumber,
      publishedAt: listings.publishedAt,
      createdAt: listings.createdAt,
      street1: properties.street1,
      city: properties.city,
      latitude: properties.latitude,
      longitude: properties.longitude,
    })
    .from(listings)
    .innerJoin(properties, eq(listings.propertyId, properties.id))
    .where(input.where)
    .orderBy(...(input.orderBy ?? [desc(listings.publishedAt), desc(listings.createdAt)]))
    .limit(input.limit)
    .offset(offset);

  const listingIds = rows.map((row) => row.id);
  const imageRows =
    listingIds.length > 0
      ? await db
          .select({
            id: listingImages.id,
            listingId: listingImages.listingId,
            imageUrl: listingImages.imageUrl,
            sortOrder: listingImages.sortOrder,
          })
          .from(listingImages)
          .where(inArray(listingImages.listingId, listingIds))
          .orderBy(asc(listingImages.sortOrder))
      : [];

  return {
    total,
    rows: rows.map((row) => ({
      ...row,
      customFields: row.customFields as ListingCustomFields,
    })),
    imageRows,
  };
}

export async function findListingRecordById(
  listingId: ListingIdParam,
): Promise<ListingRecord | null> {
  const [listing] = await db
    .select({
      id: listings.id,
      title: listings.title,
      description: listings.description,
      status: listings.status,
      unitNumber: listings.unitNumber,
      buildingType: listings.buildingType,
      bedrooms: listings.bedrooms,
      bathrooms: listings.bathrooms,
      squareFeet: listings.squareFeet,
      monthlyRentCents: listings.monthlyRentCents,
      availableOn: listings.availableOn,
      leaseTermMonths: listings.leaseTermMonths,
      utilitiesIncluded: listings.utilitiesIncluded,
      maxIncomeCents: listings.maxIncomeCents,
      applicationUrl: listings.applicationUrl,
      applicationEmail: listings.applicationEmail,
      applicationPhone: listings.applicationPhone,
      customFields: listings.customFields,
      publishedAt: listings.publishedAt,
      archivedAt: listings.archivedAt,
      createdAt: listings.createdAt,
      updatedAt: listings.updatedAt,
      property: {
        id: properties.id,
        ownerUserId: properties.ownerUserId,
        name: properties.name,
        street1: properties.street1,
        street2: properties.street2,
        city: properties.city,
        province: properties.province,
        postalCode: properties.postalCode,
        neighborhood: properties.neighborhood,
        latitude: properties.latitude,
        longitude: properties.longitude,
        contactName: properties.contactName,
        contactEmail: properties.contactEmail,
        contactPhone: properties.contactPhone,
      },
    })
    .from(listings)
    .innerJoin(properties, eq(listings.propertyId, properties.id))
    .where(eq(listings.id, listingId))
    .limit(1);

  return listing
    ? {
        ...listing,
        customFields: listing.customFields as ListingCustomFields,
      }
    : null;
}

export async function findListingImagesByListingId(listingId: ListingIdParam) {
  return db
    .select({
      id: listingImages.id,
      imageUrl: listingImages.imageUrl,
      altText: listingImages.altText,
    })
    .from(listingImages)
    .where(eq(listingImages.listingId, listingId))
    .orderBy(asc(listingImages.sortOrder));
}

export async function findListingImagesByListingIds(listingIds: string[]) {
  if (listingIds.length === 0) {
    return [];
  }

  return db
    .select({
      id: listingImages.id,
      listingId: listingImages.listingId,
      imageUrl: listingImages.imageUrl,
    })
    .from(listingImages)
    .where(inArray(listingImages.listingId, listingIds))
    .orderBy(asc(listingImages.listingId), asc(listingImages.sortOrder));
}

export async function createListingImageUpload(input: {
  uploadedByUserId: string;
  listingId: string;
  imageData: Buffer;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  width: number;
  height: number;
}) {
  const [sortOrderRow] = await db
    .select({
      nextSortOrder: sql<number>`coalesce(max(${listingImages.sortOrder}), -1) + 1`,
    })
    .from(listingImages)
    .where(eq(listingImages.listingId, input.listingId));

  const [image] = await db
    .insert(listingImages)
    .values({
      listingId: input.listingId,
      uploadSessionId: null,
      uploadedByUserId: input.uploadedByUserId,
      imageUrl: null,
      imageData: input.imageData,
      originalFilename: input.originalFilename,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      width: input.width,
      height: input.height,
      altText: null,
      sortOrder: sortOrderRow?.nextSortOrder ?? 0,
    })
    .returning({
      id: listingImages.id,
    });

  if (!image) {
    throw new Error("Failed to create image upload.");
  }

  return image;
}

export async function findListingImageById(imageId: string) {
  const [image] = await db
    .select({
      id: listingImages.id,
      listingId: listingImages.listingId,
      uploadedByUserId: listingImages.uploadedByUserId,
      imageUrl: listingImages.imageUrl,
      imageData: listingImages.imageData,
      contentType: listingImages.contentType,
      sizeBytes: listingImages.sizeBytes,
      listingStatus: listings.status,
      listingOwnerUserId: properties.ownerUserId,
    })
    .from(listingImages)
    .leftJoin(listings, eq(listingImages.listingId, listings.id))
    .leftJoin(properties, eq(listings.propertyId, properties.id))
    .where(eq(listingImages.id, imageId))
    .limit(1);

  return image ?? null;
}

export async function findPublicFeatureDefinitionsByKeys(keys: string[]) {
  if (keys.length === 0) {
    return [];
  }

  return db
    .select({
      key: customListingFields.key,
      label: customListingFields.label,
      description: customListingFields.description,
      category: customListingFields.category,
      sortOrder: customListingFields.sortOrder,
    })
    .from(customListingFields)
    .where(and(inArray(customListingFields.key, keys), eq(customListingFields.isPublic, true)))
    .orderBy(
      asc(customListingFields.category),
      asc(customListingFields.sortOrder),
      asc(customListingFields.key),
    );
}

export async function findPublicBooleanFeatureDefinitions() {
  return db
    .select({
      key: customListingFields.key,
      label: customListingFields.label,
      description: customListingFields.description,
      category: customListingFields.category,
      sortOrder: customListingFields.sortOrder,
    })
    .from(customListingFields)
    .where(
      and(
        eq(customListingFields.isPublic, true),
        eq(customListingFields.isFilterable, true),
        eq(customListingFields.fieldType, "boolean"),
      ),
    )
    .orderBy(
      asc(customListingFields.category),
      asc(customListingFields.sortOrder),
      asc(customListingFields.key),
    );
}

export async function createDraftListing(input: { actorUserId: string }) {
  return db.transaction(async (tx) => {
    const [property] = await tx
      .insert(properties)
      .values({
        ownerUserId: input.actorUserId,
        name: "",
        street1: "",
        street2: null,
        city: "",
        province: "",
        postalCode: "",
        country: DEFAULT_PROPERTY_COUNTRY,
        neighborhood: null,
        latitude: null,
        longitude: null,
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
      })
      .returning({ id: properties.id });

    if (!property) {
      throw new Error("Failed to create draft property.");
    }

    const [listing] = await tx
      .insert(listings)
      .values({
        propertyId: property.id,
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
        title: "",
        description: null,
        status: "draft",
        unitNumber: null,
        buildingType: null,
        bedrooms: 0,
        bathrooms: 0,
        squareFeet: null,
        monthlyRentCents: 0,
        availableOn: null,
        leaseTermMonths: null,
        utilitiesIncluded: [],
        maxIncomeCents: null,
        applicationUrl: null,
        applicationEmail: "",
        applicationPhone: "",
        applicationInstructions: null,
        customFields: {},
        publishedAt: null,
        archivedAt: null,
      })
      .returning({ id: listings.id });

    if (!listing) {
      throw new Error("Failed to create draft listing.");
    }

    return listing;
  });
}

export async function duplicateListingGraph(input: {
  listingId: ListingIdParam;
  actorUserId: string;
  title: string;
}) {
  return db.transaction(async (tx) => {
    const [source] = await tx
      .select()
      .from(listings)
      .where(eq(listings.id, input.listingId))
      .limit(1);

    if (!source) {
      throw new Error("Failed to load listing to duplicate.");
    }

    const [sourceProperty] = await tx
      .select()
      .from(properties)
      .where(eq(properties.id, source.propertyId))
      .limit(1);

    if (!sourceProperty) {
      throw new Error("Failed to load property to duplicate.");
    }

    const [property] = await tx
      .insert(properties)
      .values({
        ownerUserId: sourceProperty.ownerUserId,
        name: sourceProperty.name,
        street1: sourceProperty.street1,
        street2: sourceProperty.street2,
        city: sourceProperty.city,
        province: sourceProperty.province,
        postalCode: sourceProperty.postalCode,
        country: sourceProperty.country,
        neighborhood: sourceProperty.neighborhood,
        latitude: sourceProperty.latitude,
        longitude: sourceProperty.longitude,
        contactName: sourceProperty.contactName,
        contactEmail: sourceProperty.contactEmail,
        contactPhone: sourceProperty.contactPhone,
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
      })
      .returning({ id: properties.id });

    if (!property) {
      throw new Error("Failed to duplicate property.");
    }

    const [listing] = await tx
      .insert(listings)
      .values({
        propertyId: property.id,
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
        title: input.title,
        description: source.description,
        status: "draft",
        // Cleared rather than copied: these are the two fields that are
        // near-certain to differ for a new unit in the same building.
        unitNumber: null,
        buildingType: source.buildingType,
        bedrooms: source.bedrooms,
        bathrooms: source.bathrooms,
        squareFeet: source.squareFeet,
        monthlyRentCents: source.monthlyRentCents,
        availableOn: null,
        leaseTermMonths: source.leaseTermMonths,
        utilitiesIncluded: source.utilitiesIncluded,
        maxIncomeCents: source.maxIncomeCents,
        applicationUrl: source.applicationUrl,
        applicationEmail: source.applicationEmail,
        applicationPhone: source.applicationPhone,
        applicationInstructions: source.applicationInstructions,
        customFields: source.customFields as ListingCustomFields,
        publishedAt: null,
        archivedAt: null,
      })
      .returning({ id: listings.id });

    if (!listing) {
      throw new Error("Failed to duplicate listing.");
    }

    // Copy image rows in SQL so bytea payloads never leave the database.
    await tx.execute(sql`
      insert into listing_images (
        listing_id, uploaded_by_user_id, image_url, image_data, content_type,
        size_bytes, width, height, original_filename, alt_text, sort_order
      )
      select ${listing.id}::uuid, uploaded_by_user_id, image_url, image_data, content_type,
        size_bytes, width, height, original_filename, alt_text, sort_order
      from listing_images
      where listing_id = ${input.listingId}::uuid
    `);

    return listing;
  });
}

export async function findOwnerListings(ownerUserId: string): Promise<OwnerListingRow[]> {
  return db
    .select({
      id: listings.id,
      title: listings.title,
      status: listings.status,
      monthlyRentCents: listings.monthlyRentCents,
      bedrooms: listings.bedrooms,
      bathrooms: listings.bathrooms,
      squareFeet: listings.squareFeet,
      customFields: listings.customFields,
      unitNumber: listings.unitNumber,
      publishedAt: listings.publishedAt,
      createdAt: listings.createdAt,
      updatedAt: listings.updatedAt,
      street1: properties.street1,
      city: properties.city,
    })
    .from(listings)
    .innerJoin(properties, eq(listings.propertyId, properties.id))
    .where(eq(properties.ownerUserId, ownerUserId))
    .orderBy(desc(listings.updatedAt), desc(listings.createdAt))
    .then((rows) =>
      rows.map((row) => ({
        ...row,
        customFields: row.customFields as ListingCustomFields,
      })),
    );
}

export async function createListing(input: {
  actorUserId: string;
  payload: CreateListingInput;
  primaryUnitRentCents: number;
  customFields: ListingCustomFields;
  publishedAt: Date | null;
  archivedAt: Date | null;
}) {
  return db.transaction(async (tx) => {
    const [property] = await tx
      .insert(properties)
      .values({
        ownerUserId: input.actorUserId,
        name: input.payload.name,
        street1: input.payload.address.street,
        street2: input.payload.address.street2 ?? null,
        city: input.payload.address.city,
        province: input.payload.address.province,
        postalCode: input.payload.address.postalCode,
        country: DEFAULT_PROPERTY_COUNTRY,
        neighborhood: input.payload.address.neighborhood ?? null,
        latitude: input.payload.address.latitude ?? null,
        longitude: input.payload.address.longitude ?? null,
        contactName: input.payload.contact.name,
        contactEmail: input.payload.contact.email,
        contactPhone: input.payload.contact.phone,
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
      })
      .returning({ id: properties.id });

    if (!property) {
      throw new Error("Failed to create property.");
    }

    const primaryUnit = input.payload.units[0];

    const [listing] = await tx
      .insert(listings)
      .values({
        propertyId: property.id,
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
        title: input.payload.title,
        description: input.payload.description ?? null,
        status: input.payload.status,
        unitNumber: input.payload.unitNumber ?? null,
        buildingType: input.payload.buildingType,
        bedrooms: primaryUnit.bedrooms,
        bathrooms: primaryUnit.bathrooms,
        squareFeet: primaryUnit.sqft ?? null,
        monthlyRentCents: input.primaryUnitRentCents,
        availableOn: primaryUnit.availableDate ?? null,
        leaseTermMonths: input.payload.leaseTermMonths,
        utilitiesIncluded: input.payload.utilitiesIncluded ?? [],
        maxIncomeCents: null,
        applicationUrl: input.payload.applicationUrl ?? null,
        applicationEmail: input.payload.contact.email,
        applicationPhone: input.payload.contact.phone,
        applicationInstructions: null,
        customFields: input.customFields,
        publishedAt: input.publishedAt,
        archivedAt: input.archivedAt,
      })
      .returning({ id: listings.id });

    if (!listing) {
      throw new Error("Failed to create listing.");
    }

    if (input.payload.images.length > 0) {
      for (const [index, image] of input.payload.images.entries()) {
        const [updatedImage] = await tx
          .update(listingImages)
          .set({
            listingId: listing.id,
            altText: image.caption ?? `${input.payload.title} image ${index + 1}`,
            sortOrder: index,
          })
          .where(
            and(
              eq(listingImages.id, image.id),
              eq(listingImages.uploadedByUserId, input.actorUserId),
            ),
          )
          .returning({ id: listingImages.id });

        if (!updatedImage) {
          throw new Error("Failed to update listing image.");
        }
      }
    }

    return listing;
  });
}

export async function updateListingGraph(input: {
  actorUserId: string;
  listingId: ListingIdParam;
  propertyId: string;
  property: {
    name: string;
    street1: string;
    street2: string | null;
    city: string;
    province: string;
    postalCode: string;
    neighborhood: string | null;
    latitude: number | null;
    longitude: number | null;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
  };
  listing: {
    title: string;
    description: string | null;
    status: ListingStatus;
    unitNumber: string | null;
    buildingType: ListingBuildingType | null;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number | null;
    monthlyRentCents: number;
    availableOn: string | null;
    leaseTermMonths: number | null;
    utilitiesIncluded: UtilityIncluded[];
    maxIncomeCents: number | null;
    applicationUrl: string | null;
    applicationEmail: string | null;
    applicationPhone: string | null;
    customFields: ListingCustomFields;
    publishedAt: Date | null;
    archivedAt: Date | null;
  };
  images?: NonNullable<UpdateListingInput["images"]>;
  imageAltTextBase: string;
}) {
  await db.transaction(async (tx) => {
    await tx
      .update(properties)
      .set({
        name: input.property.name,
        street1: input.property.street1,
        street2: input.property.street2,
        city: input.property.city,
        province: input.property.province,
        postalCode: input.property.postalCode,
        neighborhood: input.property.neighborhood,
        latitude: input.property.latitude,
        longitude: input.property.longitude,
        contactName: input.property.contactName,
        contactEmail: input.property.contactEmail,
        contactPhone: input.property.contactPhone,
        updatedByUserId: input.actorUserId,
      })
      .where(eq(properties.id, input.propertyId));

    await tx
      .update(listings)
      .set({
        title: input.listing.title,
        description: input.listing.description,
        status: input.listing.status,
        unitNumber: input.listing.unitNumber,
        buildingType: input.listing.buildingType,
        bedrooms: input.listing.bedrooms,
        bathrooms: input.listing.bathrooms,
        squareFeet: input.listing.squareFeet,
        monthlyRentCents: input.listing.monthlyRentCents,
        availableOn: input.listing.availableOn,
        leaseTermMonths: input.listing.leaseTermMonths,
        utilitiesIncluded: input.listing.utilitiesIncluded,
        maxIncomeCents: input.listing.maxIncomeCents,
        applicationUrl: input.listing.applicationUrl,
        applicationEmail: input.listing.applicationEmail,
        applicationPhone: input.listing.applicationPhone,
        customFields: input.listing.customFields,
        updatedByUserId: input.actorUserId,
        publishedAt: input.listing.publishedAt,
        archivedAt: input.listing.archivedAt,
      })
      .where(eq(listings.id, input.listingId));

    if (input.images !== undefined) {
      if (input.images.length > 0) {
        await tx
          .update(listingImages)
          .set({
            listingId: input.listingId,
          })
          .where(
            and(
              inArray(
                listingImages.id,
                input.images.map((image) => image.id),
              ),
              eq(listingImages.uploadedByUserId, input.actorUserId),
            ),
          );

        await Promise.all(
          input.images.map((image, index) =>
            tx
              .update(listingImages)
              .set({
                altText: image.caption ?? `${input.imageAltTextBase} image ${index + 1}`,
                sortOrder: index,
              })
              .where(
                and(eq(listingImages.id, image.id), eq(listingImages.listingId, input.listingId)),
              ),
          ),
        );
      }

      await tx.delete(listingImages).where(
        and(
          eq(listingImages.listingId, input.listingId),
          input.images.length > 0
            ? notInArray(
                listingImages.id,
                input.images.map((image) => image.id),
              )
            : sql`true`,
        ),
      );
    }
  });
}

export async function archiveListing(input: {
  listingId: ListingIdParam;
  publishedAt: Date | null;
  actorUserId: string;
}) {
  await db
    .update(listings)
    .set({
      status: "archived",
      archivedAt: new Date(),
      publishedAt: input.publishedAt,
      updatedByUserId: input.actorUserId,
    })
    .where(eq(listings.id, input.listingId));
}
