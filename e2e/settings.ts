// Shared settings for the Playwright server, database preparation, and specs.
// Everything here targets a disposable local database, never the normal dev database.

export const E2E_PORT = Number(process.env.E2E_PORT || 3100);
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

// scripts/seed-auth-review.ts only accepts a local database named homehub_auth_review.
// The default matches the docker-compose Postgres port (POSTGRES_PORT, default 5433).
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5433/homehub_auth_review";

// Test-only password for the seeded review accounts. It only ever exists in the local review database.
export const E2E_REVIEW_PASSWORD = process.env.E2E_REVIEW_PASSWORD ?? "playwright-review-password";

// A fixed invite token so the invite activation page can be captured. Only its SHA-256 hash is stored.
export const E2E_INVITE_TOKEN = "playwright-pending-invite-token";
export const E2E_INVITED_EMAIL = "invited@homehub.test";

export const E2E_ACCOUNTS = {
  admin: "admin@homehub.test",
  partner: "seed-partner-waterloo@example.com",
  searcher: "searcher@homehub.test",
} as const;

export type SignedInRole = keyof typeof E2E_ACCOUNTS;
export type Role = SignedInRole | "anonymous";

export function storageStatePath(role: SignedInRole) {
  return `e2e/.auth/${role}.json`;
}
