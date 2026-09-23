import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { getOptionalSession } from "@/lib/auth/session";
import {
  duplicateListingGraph,
  findListingRecordById,
  findListingImagesByListingId,
  findPublicBooleanFeatureDefinitions,
  updateListingGraph,
  type ListingRecord,
} from "@/lib/listings/listing.repository";
import {
  duplicateListingByIdService,
  getListingByIdService,
  getListingEditorByIdService,
  patchListingByIdService,
} from "@/lib/listings/listing.service";

jest.mock("@/lib/auth/session", () => ({
  getOptionalSession: jest.fn(),
}));

jest.mock("@/lib/listings/listing.repository", () => ({
  duplicateListingGraph: jest.fn(),
  findFeatureDefinitionApplicabilityByKeys: jest.fn(),
  findListingRecordById: jest.fn(),
  findListingImagesByListingId: jest.fn(),
  findPublicBooleanFeatureDefinitions: jest.fn(),
  updateListingGraph: jest.fn(),
}));

const ACTOR_USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "44444444-4444-4444-8444-444444444444";
const LISTING_ID = "22222222-2222-4222-8222-222222222222";
const getOptionalSessionMock = jest.mocked(getOptionalSession);
const findListingRecordByIdMock = jest.mocked(findListingRecordById);
const duplicateListingGraphMock = jest.mocked(duplicateListingGraph);

const archivedListing: ListingRecord = {
  id: LISTING_ID,
  title: "Archived listing",
  description: "Previously available unit.",
  status: "archived",
  unitNumber: "204",
  buildingType: "apartment",
  bedrooms: 1,
  bathrooms: 1,
  squareFeet: 650,
  monthlyRentCents: 145000,
  availableOn: null,
  leaseTermMonths: 12,
  heatingType: "natural_gas",
  depositInfo: null,
  utilitiesIncluded: ["water"],
  maxIncomeCents: null,
  applicationUrl: null,
  applicationEmail: "leasing@example.com",
  applicationPhone: "519-555-0100",
  applicationInstructions: "Email to book a viewing. We reply within two business days.",
  customFields: {},
  publishedAt: new Date("2026-01-01T00:00:00Z"),
  archivedAt: new Date("2026-02-01T00:00:00Z"),
  createdAt: new Date("2025-12-01T00:00:00Z"),
  updatedAt: new Date("2026-02-01T00:00:00Z"),
  property: {
    id: "33333333-3333-4333-8333-333333333333",
    ownerUserId: ACTOR_USER_ID,
    name: "Cedar Court",
    street1: "123 Main Street",
    street2: null,
    city: "Waterloo",
    province: "ON",
    postalCode: "N2L 3A1",
    neighbourhood: null,
    latitude: null,
    longitude: null,
    contactRole: "Property manager",
    contactName: "Leasing Office",
    contactEmail: "leasing@example.com",
    contactPhone: "519-555-0100",
  },
};

function mockPartnerSession(userId: string) {
  getOptionalSessionMock.mockResolvedValue({
    session: {
      user: {
        id: userId,
        role: "partner",
        status: "active",
        email: "partner@example.com",
        emailVerified: true,
        name: "Partner",
        twoFactorEnabled: false,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      },
      session: {
        id: "session-id",
        userId,
        token: "session-token",
        expiresAt: new Date("2026-12-31"),
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      },
    },
    authzUser: {
      id: userId,
      role: "partner",
      status: "active",
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPartnerSession(ACTOR_USER_ID);
});

describe("duplicateListingByIdService", () => {
  it("rejects an archived listing without copying it", async () => {
    findListingRecordByIdMock.mockResolvedValue(archivedListing);

    const result = await duplicateListingByIdService(LISTING_ID, {
      scope: "all",
      copyPhotos: false,
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "forbidden",
        message: "Archived listings cannot be duplicated",
      },
    });
    expect(duplicateListingGraphMock).not.toHaveBeenCalled();
  });

  it("does not reveal archived status to a partner who cannot edit the listing", async () => {
    mockPartnerSession(OTHER_USER_ID);
    findListingRecordByIdMock.mockResolvedValue(archivedListing);

    const result = await duplicateListingByIdService(LISTING_ID, {
      scope: "all",
      copyPhotos: false,
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "forbidden",
        message: "Forbidden",
      },
    });
    expect(duplicateListingGraphMock).not.toHaveBeenCalled();
  });
});

describe("listing edits and reads", () => {
  const APPLICATION_DETAILS = {
    applicationEmail: "leasing@example.com",
    applicationPhone: "519-555-0100",
    applicationInstructions: "Email to book a viewing. We reply within two business days.",
  };

  beforeEach(() => {
    findListingRecordByIdMock.mockResolvedValue({ ...archivedListing, status: "draft" });
    jest.mocked(findListingImagesByListingId).mockResolvedValue([]);
    jest.mocked(findPublicBooleanFeatureDefinitions).mockResolvedValue([]);
    jest.mocked(updateListingGraph).mockResolvedValue(undefined);
  });

  async function patch(payload: Parameters<typeof patchListingByIdService>[0]["payload"]) {
    const result = await patchListingByIdService({ listingId: LISTING_ID, payload });
    expect(result.ok).toBe(true);
    return jest.mocked(updateListingGraph).mock.calls[0]?.[0];
  }

  it("returns the saved role and application details to searchers and the editor", async () => {
    expect(await getListingByIdService(LISTING_ID)).toMatchObject({
      ok: true,
      value: { data: { ...APPLICATION_DETAILS, contact: { role: "Property manager" } } },
    });
    expect(await getListingEditorByIdService(LISTING_ID)).toMatchObject({
      ok: true,
      value: { data: { ...APPLICATION_DETAILS, contactRole: "Property manager" } },
    });
  });

  it.each([
    ["Leasing coordinator", "Leasing coordinator"],
    [null, null],
    [undefined, "Property manager"],
  ])("updates role %s without losing omitted contact details", async (role, expected) => {
    expect(await patch({ contact: { role }, title: "Updated listing" })).toMatchObject({
      property: { contactRole: expected, contactName: "Leasing Office" },
    });
  });

  it("preserves application details when editing the general contact", async () => {
    expect(
      await patch({ contact: { email: "office@example.org", phone: "519-555-0111" } }),
    ).toMatchObject({
      property: { contactEmail: "office@example.org", contactPhone: "519-555-0111" },
      listing: APPLICATION_DETAILS,
    });
  });

  it("saves explicit application edits and clears without changing the general contact", async () => {
    const edits = {
      applicationEmail: "apply@example.org",
      applicationPhone: null,
      applicationInstructions: null,
    };
    expect(await patch(edits)).toMatchObject({
      property: { contactEmail: "leasing@example.com", contactPhone: "519-555-0100" },
      listing: edits,
    });
  });

  it.each([
    { heatingType: undefined, expected: "natural_gas" },
    { heatingType: "heat_pump" as const, expected: "heat_pump" },
    { heatingType: null, expected: null },
  ])(
    "persists heating type $expected when PATCH supplies $heatingType",
    async ({ heatingType, expected }) => {
      expect(await patch({ title: "Updated unit", heatingType })).toMatchObject({
        listing: { heatingType: expected },
      });
    },
  );
});
