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
  patchListingByIdService,
  getListingByIdService,
  getListingEditorByIdService,
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
  depositInfo: null,
  utilitiesIncluded: ["water"],
  maxIncomeCents: null,
  applicationUrl: null,
  applicationEmail: "leasing@example.com",
  applicationPhone: "519-555-0100",
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
    neighborhood: null,
    latitude: null,
    longitude: null,
    contactName: "Leasing Office",
    contactRole: "Property manager",
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

describe("listing contact role", () => {
  beforeEach(() => {
    findListingRecordByIdMock.mockResolvedValue({ ...archivedListing, status: "published" });
    jest.mocked(findListingImagesByListingId).mockResolvedValue([]);
    jest.mocked(findPublicBooleanFeatureDefinitions).mockResolvedValue([]);
  });

  it.each([
    ["Leasing coordinator", "Leasing coordinator"],
    [null, null],
    [undefined, "Property manager"],
  ])("updates role %s without losing omitted contact details", async (role, expected) => {
    const result = await patchListingByIdService({
      listingId: LISTING_ID,
      payload: { contact: { role }, title: "Updated listing" },
    });
    expect(result.ok).toBe(true);
    expect(updateListingGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        property: expect.objectContaining({ contactRole: expected, contactName: "Leasing Office" }),
      }),
    );
  });

  it("returns the saved role to searchers and the editor", async () => {
    const details = await getListingByIdService(LISTING_ID);
    const editor = await getListingEditorByIdService(LISTING_ID);
    expect(details).toMatchObject({
      ok: true,
      value: { data: { contact: { role: "Property manager" } } },
    });
    expect(editor).toMatchObject({
      ok: true,
      value: { data: { contactRole: "Property manager" } },
    });
  });
});
