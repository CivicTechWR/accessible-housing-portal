import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";
import { hashPassword } from "better-auth/crypto";
import { eq, inArray } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import nextHeaders from "next/headers";

import { getListingsDashboardData } from "@/app/listings/data";
import { db } from "@/db";
import { accounts, customListingFields, listings, properties, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getCustomListingFieldsService } from "@/lib/custom-listing-fields/custom-listing-field.service";
import {
  createDraftListingService,
  createListingService,
  getListingByIdService,
  getListingEditorByIdService,
  getListingsService,
  patchListingByIdService,
  replaceListingByIdService,
} from "@/lib/listings/listing.service";
import { createListingSchema, replaceListingSchema } from "@/shared/schemas/listings";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const userId = crypto.randomUUID();
const fieldPrefix = `feature_${crypto.randomUUID()}`;
const nonFilterableKey = `${fieldPrefix}_display`;
const filterableKey = `${fieldPrefix}_search`;
const privateKey = `${fieldPrefix}_private`;
const fieldKeys = [nonFilterableKey, filterableKey, privateKey];
const selectedFeatures = fieldKeys.map((id) => ({ id, name: id, description: id }));

const payload = createListingSchema.parse({
  title: fieldPrefix,
  name: "Feature test property",
  address: { street: "123 Test St", city: "Waterloo", province: "ON", postalCode: "N2L 3G1" },
  units: [{ bedrooms: 1, bathrooms: 1, rent: 1200 }],
  accessibilityFeatures: selectedFeatures,
  images: [],
  contact: { name: "Test Partner", email: "partner@example.test", phone: "519-555-0100" },
  status: "published",
  buildingType: "apartment",
  leaseTermMonths: 12,
  utilitiesIncluded: [],
});

describe("listing feature visibility with PostgreSQL", { skip: !testDatabaseUrl }, () => {
  before(async () => {
    assert.ok(testDatabaseUrl);
    Object.assign(process.env, {
      DATABASE_URL: testDatabaseUrl,
      NODE_ENV: "test",
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "integration-test-secret-443-not-for-production",
      EMAIL_WORKER_ENABLED: "false",
    });
    await migrate(db, { migrationsFolder: "./drizzle" });
    const email = `${userId}@example.test`;
    const password = "Integration-password-443!";
    await db.insert(users).values({
      id: userId,
      email,
      fullName: "Feature Test Partner",
      role: "partner",
      status: "active",
      emailVerified: true,
      inviteAcceptedAt: new Date(),
    });
    await db.insert(accounts).values({
      userId,
      accountId: userId,
      providerId: "credential",
      issuer: "local:credential",
      password: await hashPassword(password),
    });
    await db.insert(customListingFields).values(
      fieldKeys.map((key) => ({
        key,
        label: key,
        fieldType: "boolean" as const,
        category: "OTHER",
        appliesTo: "unit" as const,
        isPublic: key !== privateKey,
        isFilterable: key !== nonFilterableKey,
        isRequired: false,
        sortOrder: 0,
      })),
    );
    const response = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
    assert.equal(response.status, 200);
    const cookie = response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    // Services normally read these headers from Next's request scope.
    mock.method(nextHeaders, "headers", async () => new Headers({ cookie }));
  });

  after(async () => {
    mock.restoreAll();
    try {
      await db
        .delete(listings)
        .where(
          inArray(
            listings.propertyId,
            db
              .select({ id: properties.id })
              .from(properties)
              .where(eq(properties.ownerUserId, userId)),
          ),
        );
      await db.delete(properties).where(eq(properties.ownerUserId, userId));
      await db.delete(customListingFields).where(inArray(customListingFields.key, fieldKeys));
      await db.delete(users).where(eq(users.id, userId));
    } finally {
      await db.$client.end();
    }
  });

  it("persists public non-filterable fields through create, replace, and draft patches", async () => {
    const created = await createListingService({ ...payload, title: `${fieldPrefix}_persistence` });
    assert.ok(created.ok);
    const listingId = created.value.data.id;
    const [stored] = await db.select().from(listings).where(eq(listings.id, listingId));
    assert.deepEqual(stored?.customFields, { [nonFilterableKey]: true, [filterableKey]: true });

    // An existing private value must remain private when resolving any feature display.
    await db
      .update(listings)
      .set({ customFields: { ...stored.customFields, [privateKey]: true } })
      .where(eq(listings.id, listingId));
    const editor = await getListingEditorByIdService(listingId);
    assert.ok(editor.ok);
    assert.deepEqual(
      new Set(editor.value.data.customFeatures.map((field) => field.id)),
      new Set([nonFilterableKey, filterableKey]),
    );
    const details = await getListingByIdService(listingId);
    assert.ok(details.ok);
    assert.deepEqual(
      new Set(details.value.data.accessibilityFeatures?.map((field) => field.id)),
      new Set([nonFilterableKey, filterableKey]),
    );
    assert.deepEqual(
      new Set(
        details.value.data.features.flatMap((group) => group.features.map((field) => field.name)),
      ),
      new Set([nonFilterableKey, filterableKey]),
    );
    const summaries = await getListingsService({ search: `${fieldPrefix}_persistence` });
    assert.ok(summaries.ok);
    assert.deepEqual(
      new Set(summaries.value.data[0]?.accessibilityFeatures?.map((field) => field.id)),
      new Set([nonFilterableKey, filterableKey]),
    );

    const replacement = replaceListingSchema.parse({
      ...payload,
      description: null,
      address: { ...payload.address, street2: null },
      units: [{ ...payload.units[0], sqft: null, availableDate: null }],
      unitNumber: null,
      depositInfo: null,
      applicationUrl: null,
      accessibilityFeatures: [],
    });
    assert.ok((await replaceListingByIdService({ listingId, payload: replacement })).ok);
    const cleared = await getListingEditorByIdService(listingId);
    assert.ok(cleared.ok);
    assert.deepEqual(cleared.value.data.customFeatures, []);
    assert.ok(
      (
        await replaceListingByIdService({
          listingId,
          payload: { ...replacement, accessibilityFeatures: selectedFeatures },
        })
      ).ok,
    );
    const replaced = await getListingEditorByIdService(listingId);
    assert.ok(replaced.ok);
    assert.ok(replaced.value.data.customFeatures.some((field) => field.id === nonFilterableKey));

    const draft = await createDraftListingService();
    assert.ok(draft.ok);
    const draftId = draft.value.data.id;
    assert.ok(
      (
        await patchListingByIdService({
          listingId: draftId,
          payload: { accessibilityFeatures: selectedFeatures },
        })
      ).ok,
    );
    assert.ok(
      (
        await patchListingByIdService({
          listingId: draftId,
          payload: { title: "Unrelated autosave edit" },
        })
      ).ok,
    );
    const reloaded = await getListingEditorByIdService(draftId);
    assert.ok(reloaded.ok);
    assert.deepEqual(
      new Set(reloaded.value.data.customFeatures.map((field) => field.id)),
      new Set([nonFilterableKey, filterableKey]),
    );
    assert.ok(
      (
        await patchListingByIdService({
          listingId: draftId,
          payload: { accessibilityFeatures: [] },
        })
      ).ok,
    );
    const clearedDraft = await getListingEditorByIdService(draftId);
    assert.ok(clearedDraft.ok);
    assert.deepEqual(clearedDraft.value.data.customFeatures, []);
  });

  it("limits search to filterable fields without hiding saved values when filterability changes", async () => {
    const search = `${fieldPrefix}_search`;
    const withFeatures = await createListingService({ ...payload, title: search });
    assert.ok(withFeatures.ok);
    const withoutFilterableFeatures = await createListingService({
      ...payload,
      title: search,
      accessibilityFeatures: selectedFeatures.filter((field) => field.id === nonFilterableKey),
    });
    assert.ok(withoutFilterableFeatures.ok);
    await db
      .update(listings)
      .set({ customFields: { [nonFilterableKey]: true, [privateKey]: true } })
      .where(eq(listings.id, withoutFilterableFeatures.value.data.id));
    const definitions = await getCustomListingFieldsService({
      publicOnly: "true",
      type: "boolean",
    });
    const optionKeys = definitions.data.flatMap((group) => group.options.map((field) => field.id));
    assert.ok(optionKeys.includes(nonFilterableKey));
    assert.ok(!optionKeys.includes(privateKey));
    const dashboard = await getListingsDashboardData();
    const searchKeys = dashboard.dynamicGroups.flatMap((group) =>
      group.options.map((field) => field.id),
    );
    assert.ok(searchKeys.includes(filterableKey));
    assert.ok(!searchKeys.includes(nonFilterableKey));
    assert.ok(!searchKeys.includes(privateKey));

    const filtered = await getListingsService({ search, features: filterableKey });
    assert.ok(filtered.ok);
    assert.equal(filtered.value.data.length, 1);
    const listingId = filtered.value.data[0]!.id;
    const accessible = await getListingsService({ search, accessibility: "true" });
    assert.ok(accessible.ok);
    assert.deepEqual(
      accessible.value.data.map((listing) => listing.id),
      [listingId],
    );
    const inaccessible = await getListingsService({ search, accessibility: "false" });
    assert.ok(inaccessible.ok);
    assert.deepEqual(
      inaccessible.value.data.map((listing) => listing.id),
      [withoutFilterableFeatures.value.data.id],
    );
    const ignoredFilters = await getListingsService({
      search,
      features: [nonFilterableKey, privateKey],
    });
    assert.ok(ignoredFilters.ok);
    assert.equal(ignoredFilters.value.data.length, 2);
    const mixedFilters = await getListingsService({
      search,
      features: [nonFilterableKey, privateKey, filterableKey],
    });
    assert.ok(mixedFilters.ok);
    assert.equal(mixedFilters.value.data.length, 1);

    await db
      .update(customListingFields)
      .set({ isFilterable: false })
      .where(eq(customListingFields.key, filterableKey));
    const noLongerFiltered = await getListingsService({ search, features: filterableKey });
    assert.ok(noLongerFiltered.ok);
    assert.equal(noLongerFiltered.value.data.length, 2);
    const editor = await getListingEditorByIdService(listingId);
    assert.ok(editor.ok);
    assert.ok(editor.value.data.customFeatures.some((field) => field.id === filterableKey));
    const details = await getListingByIdService(listingId);
    assert.ok(details.ok);
    assert.ok(
      details.value.data.accessibilityFeatures?.some((field) => field.id === filterableKey),
    );
    const updatedDashboard = await getListingsDashboardData();
    assert.ok(
      !updatedDashboard.dynamicGroups.some((group) =>
        group.options.some((field) => field.id === filterableKey),
      ),
    );
  });
});
