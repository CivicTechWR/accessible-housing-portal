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
import {
  createDraftListingService,
  createListingService,
  getListingByIdService,
  getListingEditorByIdService,
  getListingsService,
  patchListingByIdService,
} from "@/lib/listings/listing.service";
import { createListingSchema } from "@/shared/schemas/listings";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const userId = crypto.randomUUID();
const fieldPrefix = `feature_${crypto.randomUUID()}`;
const nonFilterableKey = `${fieldPrefix}_display`;
const filterableKey = `${fieldPrefix}_search`;
const privateKey = `${fieldPrefix}_private`;
const fieldKeys = [nonFilterableKey, filterableKey, privateKey];
// Labels differ from keys so a lookup by name instead of id cannot pass.
const labelFor = (key: string) => `Label for ${key}`;
const selectedFeatures = fieldKeys.map((id) => ({
  id,
  name: labelFor(id),
  description: labelFor(id),
}));

const payload = createListingSchema.parse({
  title: fieldPrefix,
  name: "Feature test property",
  address: {
    street: "123 Test St",
    city: "Waterloo",
    province: "ON",
    postalCode: "N2L 3G1",
  },
  units: [{ bedrooms: 1, bathrooms: 1, rent: 1200 }],
  accessibilityFeatures: selectedFeatures,
  images: [],
  contact: {
    name: "Test Partner",
    email: "partner@example.test",
    phone: "519-555-0100",
  },
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
        label: labelFor(key),
        fieldType: "boolean" as const,
        category: "OTHER",
        appliesTo: "unit" as const,
        isPublic: key !== privateKey,
        isFilterable: key !== nonFilterableKey,
        isRequired: false,
        sortOrder: 0,
      })),
    );
    const response = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });
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

  it("keeps public values editable and displayed regardless of filterability", async () => {
    const title = `${fieldPrefix}_display`;
    const created = await createListingService({ ...payload, title });
    assert.ok(created.ok);
    const listingId = created.value.data.id;
    const [stored] = await db.select().from(listings).where(eq(listings.id, listingId));
    assert.deepEqual(stored?.customFields, {
      [nonFilterableKey]: true,
      [filterableKey]: true,
    });

    // A saved private value must stay out of every feature display.
    await db
      .update(listings)
      .set({ customFields: { ...stored.customFields, [privateKey]: true } })
      .where(eq(listings.id, listingId));
    const publicKeys = new Set([nonFilterableKey, filterableKey]);
    const editor = await getListingEditorByIdService(listingId);
    assert.ok(editor.ok);
    assert.deepEqual(ids(editor.value.data.customFeatures), publicKeys);
    const details = await getListingByIdService(listingId);
    assert.ok(details.ok);
    assert.deepEqual(ids(details.value.data.accessibilityFeatures), publicKeys);
    assert.deepEqual(
      new Set(details.value.data.features.flatMap((group) => group.features.map((f) => f.name))),
      new Set([...publicKeys].map(labelFor)),
    );
    const summaries = await getListingsService({ search: title });
    assert.ok(summaries.ok);
    assert.deepEqual(ids(summaries.value.data[0]?.accessibilityFeatures), publicKeys);

    // Draft autosave sends partial patches.
    const draft = await createDraftListingService();
    assert.ok(draft.ok);
    const draftId = draft.value.data.id;
    const patch = (accessibilityFeatures: typeof selectedFeatures) =>
      patchListingByIdService({
        listingId: draftId,
        payload: { accessibilityFeatures },
      });
    assert.ok((await patch(selectedFeatures)).ok);
    const reloaded = await getListingEditorByIdService(draftId);
    assert.ok(reloaded.ok);
    assert.deepEqual(ids(reloaded.value.data.customFeatures), publicKeys);
    assert.ok((await patch([])).ok);
    const cleared = await getListingEditorByIdService(draftId);
    assert.ok(cleared.ok);
    assert.deepEqual(cleared.value.data.customFeatures, []);
  });

  it("searches only public filterable fields", async () => {
    const search = `${fieldPrefix}_search`;
    const withFeatures = await createListingService({
      ...payload,
      title: search,
    });
    assert.ok(withFeatures.ok);
    const withoutFilterable = await createListingService({
      ...payload,
      title: search,
    });
    assert.ok(withoutFilterable.ok);
    await db
      .update(listings)
      .set({ customFields: { [nonFilterableKey]: true, [privateKey]: true } })
      .where(eq(listings.id, withoutFilterable.value.data.id));
    const listingId = withFeatures.value.data.id;

    const searchOptions = async () =>
      (await getListingsDashboardData()).dynamicGroups.flatMap((group) =>
        group.options.map((field) => field.id),
      );
    assert.deepEqual(
      (await searchOptions()).filter((key) => key.startsWith(fieldPrefix)),
      [filterableKey],
    );

    const searchIds = async (query: Parameters<typeof getListingsService>[0]) => {
      const result = await getListingsService({ search, ...query });
      assert.ok(result.ok);
      return result.value.data.map((listing) => listing.id).sort();
    };
    assert.deepEqual(
      await searchIds({
        features: [nonFilterableKey, privateKey, filterableKey],
      }),
      [listingId],
    );

    await db
      .update(customListingFields)
      .set({ isFilterable: false })
      .where(eq(customListingFields.key, filterableKey));
    assert.equal((await searchIds({ features: filterableKey })).length, 2);
    assert.ok(!(await searchOptions()).includes(filterableKey));
    const details = await getListingByIdService(listingId);
    assert.ok(details.ok);
    assert.ok(ids(details.value.data.accessibilityFeatures).has(filterableKey));
  });
});

function ids(fields: { id?: string }[] | undefined) {
  return new Set(fields?.map((field) => field.id));
}
