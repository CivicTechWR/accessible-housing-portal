import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { getOptionalSession } from "@/lib/auth/session";
import { findListingRecordById, type ListingRecord } from "@/lib/listings/listing.repository";
import { loadBlocks, loadPlaces, type SamModeData } from "@/lib/neighbourhood/neighbourhood.data";

import { getListingNeighbourhoodService } from "./neighbourhood.service";

jest.mock("@/lib/auth/session", () => ({
  getOptionalSession: jest.fn(),
}));

jest.mock("@/lib/listings/listing.repository", () => ({
  findListingRecordById: jest.fn(),
}));

jest.mock("@/lib/neighbourhood/neighbourhood.data", () => ({
  loadBlocks: jest.fn(),
  loadPlaces: jest.fn(),
}));

const getOptionalSessionMock = jest.mocked(getOptionalSession);
const findListingRecordByIdMock = jest.mocked(findListingRecordById);
const loadBlocksMock = jest.mocked(loadBlocks);
const loadPlacesMock = jest.mocked(loadPlaces);
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

const access = {
  health_care: 59,
  schools: 37,
  child_care: 88,
  post_secondary: 0,
  jobs: 53,
  culture_arts: 64,
  sport_recreation: 22,
};
const mode: SamModeData = { grocery_minutes: [15, 27, null], access };

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

describe("getListingNeighbourhoodService", () => {
  let warnSpy: jest.Spied<typeof console.warn>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSession();
    findListingRecordByIdMock.mockResolvedValue(listing);
    loadBlocksMock.mockResolvedValue([
      {
        dbuid: "35300002003",
        lat: 43.4643,
        lon: -80.5204,
        walking: mode,
        transit_peak: mode,
        transit_offpeak: mode,
        cycling: mode,
      },
    ]);
    loadPlacesMock.mockResolvedValue([
      {
        osm_id: "node/1",
        category: "transit",
        kind: "highway=bus_stop",
        name: "Main Street",
        lat: 43.4644,
        lon: -80.5204,
      },
    ]);
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("returns neighbourhood details for a readable listing", async () => {
    const result = await getListingNeighbourhoodService(LISTING_ID);

    expect(findListingRecordByIdMock).toHaveBeenCalledWith(LISTING_ID);
    expect(loadBlocksMock).toHaveBeenCalledTimes(1);
    expect(loadPlacesMock).toHaveBeenCalledTimes(1);
    expect(result?.block?.dbuid).toBe("35300002003");
    expect(result?.nearby.find((item) => item.groupId === "bus_stop")?.place?.name).toBe(
      "Main Street",
    );
  });

  it("returns null without a session and does not load neighbourhood data", async () => {
    getOptionalSessionMock.mockResolvedValue({ session: null, authzUser: null });

    await expect(getListingNeighbourhoodService(LISTING_ID)).resolves.toBeNull();

    expect(findListingRecordByIdMock).not.toHaveBeenCalled();
    expect(loadBlocksMock).not.toHaveBeenCalled();
    expect(loadPlacesMock).not.toHaveBeenCalled();
  });

  it("does not load neighbourhood data for a listing the actor cannot read", async () => {
    mockSession("44444444-4444-4444-8444-444444444444");
    findListingRecordByIdMock.mockResolvedValue({ ...listing, status: "draft" });

    await expect(getListingNeighbourhoodService(LISTING_ID)).resolves.toBeNull();

    expect(loadBlocksMock).not.toHaveBeenCalled();
    expect(loadPlacesMock).not.toHaveBeenCalled();
  });

  it("returns null and does not load data when listing coordinates are missing", async () => {
    findListingRecordByIdMock.mockResolvedValue({
      ...listing,
      property: { ...listing.property, longitude: null },
    });

    await expect(getListingNeighbourhoodService(LISTING_ID)).resolves.toBeNull();

    expect(loadBlocksMock).not.toHaveBeenCalled();
    expect(loadPlacesMock).not.toHaveBeenCalled();
  });

  it("returns null and warns if listing lookup fails", async () => {
    findListingRecordByIdMock.mockRejectedValue(new Error("Database error"));

    await expect(getListingNeighbourhoodService(LISTING_ID)).resolves.toBeNull();

    expect(warnSpy).toHaveBeenCalledWith("[neighbourhood] Listing lookup failed.");
  });
});
