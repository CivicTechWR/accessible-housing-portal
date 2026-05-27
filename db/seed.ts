import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import {
  customListingFields,
  listingImages,
  listings,
  lower,
  properties,
  users,
} from "./schema.ts";
import { customListingFieldSeed } from "./seeds/custom-listing-fields.ts";
import { mockListingSeedListings, mockListingSeedUsers } from "./seeds/mock-listings.ts";

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. Add it before running the seed.");
  }

  return databaseUrl;
}

async function main() {
  const sql = postgres(getDatabaseUrl(), {
    prepare: false,
  });

  const db = drizzle(sql);

  try {
    for (const field of customListingFieldSeed) {
      await db
        .insert(customListingFields)
        .values(field)
        .onConflictDoUpdate({
          target: customListingFields.key,
          set: {
            label: field.label,
            description: field.description,
            fieldType: field.fieldType,
            category: field.category,
            helpText: field.helpText,
            placeholder: field.placeholder,
            isPublic: field.isPublic,
            isFilterable: field.isFilterable,
            isRequired: field.isRequired,
            sortOrder: field.sortOrder,
            options: field.options,
            updatedAt: new Date(),
          },
        });
    }

    for (const user of mockListingSeedUsers) {
      const normalizedEmail = user.email.trim().toLowerCase();

      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(lower(users.email), normalizedEmail))
        .limit(1);

      if (existingUser) {
        await db
          .update(users)
          .set({
            id: user.id,
            email: normalizedEmail,
            fullName: user.fullName,
            organization: user.organization,
            role: user.role,
            status: user.status,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id));
      } else {
        await db.insert(users).values({
          id: user.id,
          email: normalizedEmail,
          fullName: user.fullName,
          organization: user.organization,
          role: user.role,
          status: user.status,
        });
      }
    }

    for (const seedListing of mockListingSeedListings) {
      await db
        .insert(properties)
        .values({
          id: seedListing.propertyId,
          ownerUserId: seedListing.ownerUserId,
          name: seedListing.name,
          street1: seedListing.address.street1,
          street2: null,
          city: seedListing.address.city,
          province: seedListing.address.province,
          postalCode: seedListing.address.postalCode,
          country: seedListing.address.country,
          neighborhood: seedListing.address.neighborhood,
          latitude: seedListing.address.latitude,
          longitude: seedListing.address.longitude,
          contactName: seedListing.contact.name,
          contactEmail: seedListing.contact.email,
          contactPhone: seedListing.contact.phone,
          createdByUserId: seedListing.ownerUserId,
          updatedByUserId: seedListing.ownerUserId,
        })
        .onConflictDoUpdate({
          target: properties.id,
          set: {
            ownerUserId: seedListing.ownerUserId,
            name: seedListing.name,
            street1: seedListing.address.street1,
            street2: null,
            city: seedListing.address.city,
            province: seedListing.address.province,
            postalCode: seedListing.address.postalCode,
            country: seedListing.address.country,
            neighborhood: seedListing.address.neighborhood,
            latitude: seedListing.address.latitude,
            longitude: seedListing.address.longitude,
            contactName: seedListing.contact.name,
            contactEmail: seedListing.contact.email,
            contactPhone: seedListing.contact.phone,
            updatedByUserId: seedListing.ownerUserId,
            updatedAt: new Date(),
          },
        });

      await db
        .insert(listings)
        .values({
          id: seedListing.listingId,
          propertyId: seedListing.propertyId,
          createdByUserId: seedListing.ownerUserId,
          updatedByUserId: seedListing.ownerUserId,
          title: seedListing.listing.title,
          description: seedListing.listing.description,
          status: seedListing.listing.status,
          unitNumber: null,
          bedrooms: seedListing.listing.bedrooms,
          bathrooms: seedListing.listing.bathrooms,
          squareFeet: seedListing.listing.squareFeet,
          monthlyRentCents: seedListing.listing.monthlyRentCents,
          availableOn: seedListing.listing.availableOn,
          buildingType: seedListing.listing.buildingType,
          leaseTermMonths: seedListing.listing.leaseTermMonths,
          utilitiesIncluded: seedListing.listing.utilitiesIncluded,
          maxIncomeCents: seedListing.listing.maxIncomeCents,
          applicationUrl: seedListing.listing.applicationUrl,
          applicationEmail: seedListing.listing.applicationEmail,
          applicationPhone: seedListing.listing.applicationPhone,
          applicationInstructions: null,
          customFields: seedListing.listing.customFields,
          publishedAt: seedListing.listing.publishedAt,
          archivedAt: null,
        })
        .onConflictDoUpdate({
          target: listings.id,
          set: {
            propertyId: seedListing.propertyId,
            updatedByUserId: seedListing.ownerUserId,
            title: seedListing.listing.title,
            description: seedListing.listing.description,
            status: seedListing.listing.status,
            bedrooms: seedListing.listing.bedrooms,
            bathrooms: seedListing.listing.bathrooms,
            squareFeet: seedListing.listing.squareFeet,
            monthlyRentCents: seedListing.listing.monthlyRentCents,
            availableOn: seedListing.listing.availableOn,
            buildingType: seedListing.listing.buildingType,
            leaseTermMonths: seedListing.listing.leaseTermMonths,
            utilitiesIncluded: seedListing.listing.utilitiesIncluded,
            maxIncomeCents: seedListing.listing.maxIncomeCents,
            applicationUrl: seedListing.listing.applicationUrl,
            applicationEmail: seedListing.listing.applicationEmail,
            applicationPhone: seedListing.listing.applicationPhone,
            customFields: seedListing.listing.customFields,
            publishedAt: seedListing.listing.publishedAt,
            archivedAt: null,
            updatedAt: new Date(),
          },
        });
    }

    const seededListingIds = mockListingSeedListings.map((listing) => listing.listingId);

    if (seededListingIds.length > 0) {
      await db.delete(listingImages).where(inArray(listingImages.listingId, seededListingIds));
    }

    for (const seedListing of mockListingSeedListings) {
      for (const image of seedListing.images) {
        await db.insert(listingImages).values({
          id: image.id,
          listingId: seedListing.listingId,
          uploadedByUserId: seedListing.ownerUserId,
          imageUrl: image.imageUrl,
          altText: image.altText,
          sortOrder: image.sortOrder,
        });
      }
    }

    console.log(`Seeded ${customListingFieldSeed.length} custom listing fields.`);
    console.log(`Seeded ${mockListingSeedUsers.length} mock listing users.`);
    console.log(`Seeded ${mockListingSeedListings.length} mock listings.`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

void main().catch((error: unknown) => {
  console.error("Failed to seed custom listing fields.", error);
  process.exitCode = 1;
});
