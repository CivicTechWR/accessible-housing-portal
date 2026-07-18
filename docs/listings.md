# Listings

This guide covers the listing search experience, listing detail pages, authoring workflow, draft autosave, images, and custom listing fields.

## Main Files

| Area                | Files                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Listing search page | `app/listings/page.tsx`, `app/listings/listings.tsx`, `app/listings/query.ts`, `app/listings/data.ts`                                      |
| Listing detail page | `app/listings/[id]/page.tsx`, `components/listing-details/ListingDetails.tsx`                                                              |
| Listing authoring   | `app/(listing-author)/listing-form/*`, `app/listing-form/*`, `components/listing-form-*`                                                   |
| My listings         | `app/(listing-author)/my-listings/page.tsx`, `app/my-listings/MyListingsClient.tsx`                                                        |
| Listing services    | `lib/listings/listing.service.ts`, `lib/listings/listing.repository.ts`, `lib/listings/listing.specifications.ts`, `lib/listings/store.ts` |
| Listing API         | `app/api/listings/*`, `app/api/listing-drafts/*`, `app/api/image-uploads/*`                                                                |
| Listing schemas     | `shared/schemas/listings.ts`                                                                                                               |
| Listing policies    | `lib/policies/listing-policy.ts`                                                                                                           |

## Listing Search Flow

Listing pages and `/api/listings` routes require an active session through `proxy.ts`. Published listings are visible to signed-in users; draft and archived listing visibility is role-limited in the listing policy.

`app/listings/page.tsx` is a Server Component. It:

1. Resolves `searchParams`.
2. Parses query values with `getListingsQueryFromSearchParams`.
3. Calls `connection()` so the route renders with request-time data.
4. Fetches initial listing results through `getListingsService`.
5. Fetches dynamic filter groups through `getListingsDashboardData`.
6. Passes initial data into the `ListingsDashboard` Client Component.

`ListingsDashboard` handles filter controls, map/list display mode, mobile filter state, and client refetches through `useListingsQuery`.

## Query Parameters

Listing search accepts these query parameters through `listingQuerySchema`:

| Query           | Meaning                                                                           |
| --------------- | --------------------------------------------------------------------------------- |
| `page`          | Positive integer page number.                                                     |
| `limit`         | Positive integer page size, capped at 100.                                        |
| `status`        | `draft`, `published`, or `archived`. Draft/archived access is role-limited.       |
| `neighborhood`  | Case-insensitive neighborhood match.                                              |
| `bedrooms`      | Exact count or count plus `+`, such as `2` or `2+`.                               |
| `bathrooms`     | Exact count or count plus `+`, such as `1` or `1+`.                               |
| `location`      | Search string, currently treated like the main search term.                       |
| `search`        | Search string across listing title, description, property name, street, and city. |
| `minPrice`      | Minimum rent in dollars.                                                          |
| `maxPrice`      | Maximum rent in dollars.                                                          |
| `maxRent`       | Legacy maximum rent alias.                                                        |
| `accessibility` | `true` or `false`, based on enabled boolean custom-field feature data.            |
| `moveInDate`    | ISO-like date string; filters listings available on or before the date.           |
| `sort`          | `newest`, `oldest`, `price_asc`, or `price_desc`.                                 |
| `features`      | One or more dynamic feature keys from public boolean custom fields.               |

The service defaults to published listing visibility unless the actor is allowed to view drafts or archived listings.

## Visibility Rules

Listing visibility is centralized in `lib/policies/listing-policy.ts`.

- Active signed-in users can read published listings through the protected listing routes.
- Anonymous users cannot read draft or archived listings.
- Admins can read and edit all listings.
- Partners can read/edit their own listings.
- Partners can list their own draft and archived listings.
- Non-admin/non-partner users cannot write listings.

Services intentionally return `not_found` for some inaccessible listing reads so private listings are not exposed by ID probing.

## Listing Search Implementation

`getListingsService` composes Drizzle specifications from `lib/listings/listing.specifications.ts`:

- status
- owner
- neighborhood
- bedroom and bathroom counts
- min/max rent
- accessibility
- text search
- available-by date
- selected dynamic feature definitions

`findListingSummaries` joins listings to properties, applies pagination and ordering, and loads image rows for the result set.

## Dynamic Filters

Filter options come from `listing_field_definitions` records where:

- `is_public = true`
- `is_filterable = true`
- `field_type = "boolean"`

`getListingsDashboardData` maps those records into `DynamicFilterGroup` values consumed by the filter accordion.

Filtering by dynamic feature checks:

- canonical boolean custom fields where `custom_fields[definition.key]` is `true`

## Listing Details

`getListingByIdService` loads a listing by ID, checks `canReadListing`, loads images, resolves display features, and returns `ListingDetails`.

Details include:

- title, price, address, beds/baths/square footage
- display accessibility features
- image URLs
- relative time
- grouped feature categories
- contact information when all contact fields are present
- an Apply button when `applicationUrl` is present
- a direct-contact instruction when complete contact details exist but no online application URL is set
- a check-back-later message when neither contact nor online application details are available
- `editUrl` for the owning user

The Apply button opens a confirmation dialog before navigating the browser to the external application URL. When there is no online application URL, the page still shows the appropriate direct-contact or missing-details guidance instead of hiding the application section.

## Authoring Workflow

The authoring routes live under the `(listing-author)` route group and are available at:

- `/listing-form`
- `/listing-form/:id`
- `/my-listings`

`app/(listing-author)/layout.tsx` requires an active `admin` or `partner` account.

The form uses:

- React Hook Form
- `listingFormSchema` in `app/listing-form/types.ts`
- API mapping helpers in `app/listing-form/api.ts`
- React Query hooks for draft creation, editor loading, and updates

## Draft Autosave

`useListingForm` owns the draft lifecycle:

1. A new form starts with local defaults and no listing ID.
2. When autosave needs a persisted row, it calls `POST /api/listing-drafts`.
3. The URL is replaced with `/listing-form/:id` after a draft is created.
4. Form changes are mapped to update payloads and saved after an 800 ms debounce.
5. Publish waits for in-flight autosave, then sends a final `PUT /api/listings/:id` with status `published`.

Published listing edits do not draft-autosave. The UI warns before navigating away with unsaved published changes.

## Create, Update, Archive

Creation and update behavior is split across service and repository code:

- `createDraftListingService` creates an empty property and draft listing.
- `createListingService` creates a property and listing in one transaction.
- `updateListingByIdService` checks edit access, merges dynamic feature state in `customFields`, updates property/listing columns, and syncs images.
- `deleteListingByIdService` archives the listing rather than deleting it.

Status timestamps are managed by `resolveListingStatusTimestamps`.

## Image Uploads

Image endpoints use direct Node.js route handlers:

- `POST /api/image-uploads`
- `GET /api/image-uploads/:id`

Upload behavior in `lib/images/image.service.ts`:

- requires an active admin or partner session
- requires edit access to the target listing
- accepts `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, and `.jxl`
- rejects files over 25 MB
- rejects images over 24 megapixels
- normalizes output to JPEG
- resizes within 1600 x 1600 without enlargement
- stores processed bytes in `listing_images.image_data`

Public published images use long immutable cache headers. Draft/private images use short private caching.

## Built-In And Custom Field Storage

The listing form includes built-in fields and admin-configured feature fields.

Built-in listing fields are persisted in normalized columns on `listings` or `properties`, including:

- title, description, status, and unit number
- building type, bedrooms, bathrooms, square feet, rent, availability, lease term, and included utilities
- application URL and contact fields
- property name and address fields

`lib/listings/store.ts` maps selected admin-configured accessibility features into `listings.custom_fields`. Current authoring writes selected public boolean feature definitions as boolean keys where `custom_fields[definition.key]` is `true`.

Create/update payloads send selected features through `accessibilityFeatures`, and each submitted feature must include the field-definition `id`. Update/autosave payloads use `applicationUrl: null` when an author clears the application URL field.

If a new listing field must be searchable, sortable, joined, or constrained at scale, prefer a normalized column. If it is project-configurable feature metadata, prefer `listing_field_definitions` plus `customFields`.

## Adding A Listing Feature

1. Decide whether the field belongs in `listings`, `properties`, `listing_field_definitions`, or `customFields`.
2. Update `shared/schemas/listings.ts` for API/form contracts.
3. Update `app/listing-form/types.ts` and mapping helpers.
4. Update `lib/listings/store.ts` for persistence mapping.
5. Update service/repository code if normalized columns or queries change.
6. Add or update tests for schema, mapping, specifications, or UI hooks.
7. Update this document and [API Reference](api-reference.md) if public behavior changes.
