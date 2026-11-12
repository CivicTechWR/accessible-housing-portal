import { E2E_INVITE_TOKEN, type Role } from "./settings.ts";

// Seeded by db/seeds/mock-listings.ts; owned by the Waterloo demo partner.
const SEEDED_LISTING_ID = "11111111-1111-4111-8111-111111111111";

export type PageEntry = {
  /** File name for the screenshot, without extension. */
  name: string;
  path: string;
  /** The account the page is captured as. Protected pages need the role that can open them. */
  role: Role;
};

// Every route under app/ with a page.tsx. Add new pages here so they get a screenshot.
export const PAGES: PageEntry[] = [
  { name: "home", path: "/", role: "anonymous" },
  { name: "sign-in", path: "/sign-in", role: "anonymous" },
  { name: "forgot-password", path: "/forgot-password", role: "anonymous" },
  { name: "reset-password", path: "/reset-password?token=playwright", role: "anonymous" },
  { name: "reset-password-invalid", path: "/reset-password", role: "anonymous" },
  { name: "invite", path: `/invite?token=${E2E_INVITE_TOKEN}`, role: "anonymous" },
  { name: "invite-invalid", path: "/invite", role: "anonymous" },
  { name: "community-agreement", path: "/community-agreement", role: "anonymous" },

  { name: "listings", path: "/listings", role: "searcher" },
  { name: "listing-detail", path: `/listings/${SEEDED_LISTING_ID}`, role: "searcher" },
  { name: "manage-account", path: "/manage-account", role: "searcher" },

  { name: "my-listings", path: "/my-listings", role: "partner" },
  { name: "listing-form-new", path: "/listing-form", role: "partner" },
  { name: "listing-form-edit", path: `/listing-form/${SEEDED_LISTING_ID}`, role: "partner" },

  { name: "admin-users", path: "/admin/users", role: "admin" },
  { name: "admin-invite", path: "/admin/invite", role: "admin" },
  { name: "admin-custom-listing-fields", path: "/admin/custom-listing-fields", role: "admin" },
];
