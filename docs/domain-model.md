# Domain Model

The database schema is defined in `db/schema.ts` with Drizzle. SQL migrations and snapshots live under `drizzle/`.

## Enums

| Enum                 | Values                                                        | Used by                                               |
| -------------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| `user_role`          | `admin`, `partner`, `user`                                    | Access control and UI navigation.                     |
| `user_status`        | `invited`, `active`, `suspended`, `deactivated`               | Sign-in eligibility and account lifecycle.            |
| `listing_status`     | `draft`, `published`, `archived`                              | Listing visibility, authoring, and deletion behavior. |
| `listing_field_type` | `boolean`, `number`, `text`, `select`, `multi_select`, `date` | Admin-configured listing field definitions.           |

Only users with status `active` can sign in.

## Tables

### `users`

Stores local account records.

Important fields:

- `email` has a case-insensitive unique index through `lower(email)`.
- `external_auth_id` is unique but currently optional.
- `password_hash` is present for local credentials users.
- `role` controls admin, partner, and normal user behavior.
- `status` controls sign-in eligibility.
- `invite_accepted_at` and `last_login_at` support invite and audit workflows.

### `user_invites`

Stores account invite tokens by hash.

Important behavior:

- Raw invite tokens are not stored. `lib/auth/token.ts` creates opaque tokens and hashes them.
- New invites expire previous unaccepted invites for the same user.
- Invites expire after seven days.
- Accepting an invite marks the invite accepted and activates the user with a password hash.

### `properties`

Stores building/property-level data for listings.

Important fields:

- `owner_user_id` links a property to a partner/admin account.
- address, neighborhood, latitude, and longitude drive listing display and map behavior.
- contact fields feed listing details and application contact data.
- `created_by_user_id` and `updated_by_user_id` retain audit context.

### `listings`

Stores the primary listing row.

Important fields:

- `property_id` links to `properties`.
- `status` controls visibility.
- common searchable fields such as bedrooms, bathrooms, rent, availability, and square footage are normalized columns.
- `monthly_rent_cents` and `max_income_cents` store money as integer cents.
- `custom_fields` stores flexible listing data in JSONB.
- `published_at` and `archived_at` capture status transitions.

The `custom_fields` column has a GIN index because public filters can query dynamic boolean field keys.

### `listing_images`

Stores uploaded listing images and external image references.

Important behavior:

- Uploaded files are processed to JPEG and stored in `image_data`.
- Seeded or external images can use `image_url`.
- Images may be attached to a listing or temporarily associated with the uploading user before publish.
- `sort_order` controls display order.

### `saved_listings`

Stores many-to-many saved listing records between users and listings. Current code defines the table but the main saved-listing product flow is not yet a primary user-facing area.

### `saved_searches`

Stores named search filters as JSONB per user. Current code defines the table for future saved-search behavior.

### `listing_field_definitions`

Stores admin-configured custom listing field definitions.

Important fields:

- `key` is unique and becomes the stable field identifier in listing `custom_fields`.
- `label`, `description`, `help_text`, and `placeholder` drive UI display.
- `field_type` describes expected value shape.
- `category` groups fields for display and reordering.
- `is_public` controls whether the field is visible outside admin surfaces.
- `is_filterable` controls whether it can be used as a public filter.
- `is_required` is available for validation/UI policy.
- `sort_order` orders fields inside a category.
- `options` stores selectable values for select-style fields.

Admin services normalize categories to uppercase when creating or updating definitions.

## Relationships

```text
users
  -> user_invites.created_by_user_id
  -> properties.owner_user_id
  -> properties.created_by_user_id / updated_by_user_id
  -> listings.created_by_user_id / updated_by_user_id
  -> listing_images.uploaded_by_user_id
  -> saved_listings.user_id
  -> saved_searches.user_id
  -> listing_field_definitions.created_by_user_id / updated_by_user_id

properties
  -> listings.property_id

listings
  -> listing_images.listing_id
  -> saved_listings.listing_id
```

Deletion behavior:

- Deleting a user cascades invites, listing image upload ownership, saved listings, and saved searches where configured.
- Properties and listings use restrictive ownership references because listing records should not silently disappear when an owner changes.
- Deleting a listing cascades listing images and saved listing rows.
- "Deleting" a listing through product behavior archives it rather than removing the row.

## `custom_fields` JSON

Listing authoring stores flexible fields in `listings.custom_fields`. Current keys include:

- `units`
- `amenities`
- `accessibilityFeatures` for legacy feature values
- boolean keys that match `listing_field_definitions.key`
- `applicationMethod`
- `externalApplicationUrl`
- `eligibilityCriteria`
- `propertyType`
- `buildingType`
- `unitStory`
- `leaseTerm`
- `utilitiesIncluded`

Normalized columns still exist for the primary searchable values: status, rent, bedrooms, bathrooms, available date, square feet, and application contact fields. Use normalized columns when a field must be frequently filtered, sorted, joined, or constrained. Use `custom_fields` for flexible listing metadata that can vary by project configuration.

## Money And Dates

- Rent and income values are persisted as cents.
- Form/API values often use dollar amounts and are converted in `lib/listings/store.ts` or `lib/listings/listing.service.ts`.
- Listing availability uses a Postgres `date` column and ISO date strings at schema boundaries.
- User/account timestamps use timezone-aware Postgres timestamps.

## Migrations

When changing persistence:

1. Update `db/schema.ts`.
2. Generate a migration with `npm run db:generate`.
3. Review the generated SQL under `drizzle/`.
4. Apply it locally with `npm run db:migrate`.
5. Update seed data if the change affects local setup.
6. Update this document when tables, enums, relationships, or conventions change.

Do not hand-edit Drizzle snapshot files unless you are repairing a migration state issue and understand the impact.

## Seeds

`db/seed.ts` is idempotent for the current seed records. It upserts custom listing field definitions, mock users, properties, listings, and listing image references.

Seed data comes from:

- `db/seeds/custom-listing-fields.ts`
- `db/seeds/mock-listings.ts`
