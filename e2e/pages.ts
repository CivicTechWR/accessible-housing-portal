import { E2E_INVITE_TOKEN, E2E_SEEDED_LISTING_ID, type Role } from "./settings.ts";

export type PageEntry = {
  /** File name for the screenshot, without extension. */
  name: string;
  path: string;
  /** The account the page is captured as. Protected pages need the role that can open them. */
  role: Role;
  /** Text the page must show, for pages whose error state would otherwise also pass. */
  expectText?: string;
  /** Captured at desktop size only. Admin screens aren't designed for mobile. */
  desktopOnly?: boolean;
  /** Captured at mobile size only, for views that only exist below the lg breakpoint. */
  mobileOnly?: boolean;
  /** Name of a toggle option to select after the page loads, to capture a different view of it. */
  selectOption?: string;
};

// Every route under app/ with a page.tsx. Add new pages here so they get a screenshot.
export const PAGES: PageEntry[] = [
  { name: "home", path: "/", role: "anonymous" },
  { name: "sign-in", path: "/sign-in", role: "anonymous" },
  { name: "forgot-password", path: "/forgot-password", role: "anonymous" },
  { name: "reset-password", path: "/reset-password?token=playwright", role: "anonymous" },
  { name: "reset-password-invalid", path: "/reset-password", role: "anonymous" },
  {
    name: "invite",
    path: `/invite?token=${E2E_INVITE_TOKEN}`,
    role: "anonymous",
    expectText: "Step 1 of 2: Community agreement",
  },
  { name: "invite-invalid", path: "/invite", role: "anonymous" },
  { name: "community-agreement", path: "/community-agreement", role: "anonymous" },

  { name: "listings", path: "/listings", role: "searcher" },
  { name: "listing-detail", path: `/listings/${E2E_SEEDED_LISTING_ID}`, role: "searcher" },
  { name: "manage-account", path: "/manage-account", role: "searcher" },

  { name: "my-listings", path: "/my-listings", role: "partner" },
  { name: "listing-form-new", path: "/listing-form", role: "partner" },
  { name: "listing-form-edit", path: `/listing-form/${E2E_SEEDED_LISTING_ID}`, role: "partner" },
  {
    name: "listing-form-edit-preview",
    path: `/listing-form/${E2E_SEEDED_LISTING_ID}`,
    role: "partner",
    mobileOnly: true,
    selectOption: "Preview",
  },

  { name: "admin-users", path: "/admin/users", role: "admin", desktopOnly: true },
  { name: "admin-invite", path: "/admin/invite", role: "admin", desktopOnly: true },
  {
    name: "admin-custom-listing-fields",
    path: "/admin/custom-listing-fields",
    role: "admin",
    desktopOnly: true,
  },
];
