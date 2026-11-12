// Shared settings for the Playwright server, database preparation, and specs.
// Everything here targets a disposable local database, never the normal dev database.
import { mockListingSeedListings, mockListingSeedUsers } from "../db/seeds/mock-listings.ts";

export const E2E_PORT = Number(process.env.E2E_PORT || 3100);
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

// scripts/seed-auth-review.ts only accepts a local database named homehub_auth_review.
// The default matches the docker-compose Postgres port (POSTGRES_PORT, default 5433).
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5433/homehub_auth_review";

// Test-only password for the seeded review accounts. It only ever exists in the local review database.
export const E2E_REVIEW_PASSWORD = "playwright-review-password";

// A fixed invite token so the invite activation page can be captured. Only its SHA-256 hash is stored.
export const E2E_INVITE_TOKEN = "playwright-pending-invite-token";
export const E2E_INVITED_EMAIL = "invited@homehub.test";

// The partner signs in as the owner of this seeded listing, so it can open the edit form.
const seededListing = mockListingSeedListings[0];
const seededListingOwner = mockListingSeedUsers.find(
  (user) => user.id === seededListing?.ownerUserId,
);
if (!seededListing || !seededListingOwner) throw new Error("Mock listing seeds are missing.");
export const E2E_SEEDED_LISTING_ID = seededListing.listingId;

export const E2E_ACCOUNTS = {
  admin: "admin@homehub.test",
  partner: seededListingOwner.email,
  searcher: "searcher@homehub.test",
};

export type SignedInRole = keyof typeof E2E_ACCOUNTS;
export type Role = SignedInRole | "anonymous";
export const SIGNED_IN_ROLES = Object.keys(E2E_ACCOUNTS) as SignedInRole[];

export function storageStatePath(role: SignedInRole) {
  return `e2e/.auth/${role}.json`;
}
