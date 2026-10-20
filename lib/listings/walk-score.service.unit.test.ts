import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { getOptionalSession } from "@/lib/auth/session";
import { findListingRecordById, type ListingRecord } from "@/lib/listings/listing.repository";
import { getWalkScore } from "@/lib/walk-score/walk-score.client";

import { getListingWalkScoreService } from "./walk-score.service";

jest.mock("@/lib/auth/session", () => ({
  getOptionalSession: jest.fn(),
}));

jest.mock("@/lib/listings/listing.repository", () => ({
  findListingRecordById: jest.fn(),
}));

jest.mock("@/lib/walk-score/walk-score.client", () => ({
  getWalkScore: jest.fn(),
}));

const getOptionalSessionMock = jest.mocked(getOptionalSession);
const findListingRecordByIdMock = jest.mocked(findListingRecordById);
const getWalkScoreMock = jest.mocked(getWalkScore);
const ORIGINAL_ENV = process.env;
const LISTING_ID = "22222222-2222-4222-8222-222222222222";
const OWNER_ID = "11111111-1111-4111-8111-111111111111";

const listing = {
  id: LISTING_ID,
  title: "Cedar Court",
  status: "published",
  unitNumber: "204",
  property: {
    ownerUserId: OWNER_ID,
    street1: "123 Main Street",
    street2: null,
    city: "Waterloo",
    province: "ON",
    postalCode: "N2L 3A1",
    latitude: 43.4643,
    longitude: -80.5204,
  },
} as ListingRecord;

function mockSession(userId = OWNER_ID) {
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

describe("getListingWalkScoreService", () => {
  let warnSpy: jest.Spied<typeof console.warn>;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, WALKSCORE_API_KEY: "test-key" };
    jest.clearAllMocks();
    mockSession();
    findListingRecordByIdMock.mockResolvedValue(listing);
    getWalkScoreMock.mockResolvedValue(null);
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    warnSpy.mockRestore();
  });

  it("returns null without a key and does not look up the listing", async () => {
    delete process.env.WALKSCORE_API_KEY;

    await expect(getListingWalkScoreService(LISTING_ID)).resolves.toBeNull();

    expect(getOptionalSessionMock).not.toHaveBeenCalled();
    expect(findListingRecordByIdMock).not.toHaveBeenCalled();
    expect(getWalkScoreMock).not.toHaveBeenCalled();
  });

  it("looks up a supported listing using its complete address and coordinates", async () => {
    await getListingWalkScoreService(LISTING_ID);

    expect(findListingRecordByIdMock).toHaveBeenCalledWith(LISTING_ID);
    expect(getWalkScoreMock).toHaveBeenCalledWith({
      address: "204 - 123 Main Street, Waterloo N2L 3A1, ON",
      latitude: 43.4643,
      longitude: -80.5204,
    });
  });

  it("returns null without calling Walk Score when coordinates are missing", async () => {
    findListingRecordByIdMock.mockResolvedValue({
      ...listing,
      property: { ...listing.property, latitude: null },
    });

    await expect(getListingWalkScoreService(LISTING_ID)).resolves.toBeNull();

    expect(getWalkScoreMock).not.toHaveBeenCalled();
  });

  it("does not look up scores for a listing the actor cannot read", async () => {
    mockSession("44444444-4444-4444-8444-444444444444");
    findListingRecordByIdMock.mockResolvedValue({
      ...listing,
      status: "draft",
    });

    await expect(getListingWalkScoreService(LISTING_ID)).resolves.toBeNull();

    expect(getWalkScoreMock).not.toHaveBeenCalled();
  });

  it("returns null and warns if listing lookup fails", async () => {
    findListingRecordByIdMock.mockRejectedValue(new Error("Database error"));

    await expect(getListingWalkScoreService(LISTING_ID)).resolves.toBeNull();

    expect(warnSpy).toHaveBeenCalledWith("[walk-score] Listing lookup failed.");
  });
});
