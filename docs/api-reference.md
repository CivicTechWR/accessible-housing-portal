# API Reference

API routes live under `app/api`. Most JSON routes use `next-rest-framework` plus Zod schemas from `shared/schemas`.

## API Conventions

- `route.ts` declares HTTP methods, input schemas, output schemas, and possible statuses.
- `handlers.ts` reads request data and calls a service.
- Services return `DomainResult<T>` when domain errors are expected.
- `mapDomainErrorToHttpResponse` maps domain errors to HTTP statuses.
- Request and response contracts live in `shared/schemas`.
- Protected behavior must be enforced in services or route handlers, not only in `proxy.ts`.

Domain error mapping:

| Domain code    | HTTP status |
| -------------- | ----------- |
| `unauthorized` | `401`       |
| `forbidden`    | `403`       |
| `not_found`    | `404`       |
| `validation`   | `400`       |
| `conflict`     | `409`       |

Error responses use:

```json
{
  "message": "Human-readable error"
}
```

## Listings

| Method   | Path                       | Auth                                                       | Purpose                                                 | Contract source                                      |
| -------- | -------------------------- | ---------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| `GET`    | `/api/listings`            | Public, with optional session for draft/archive visibility | List listings with filters and pagination.              | `listingQuerySchema`, `listingListResponseSchema`    |
| `POST`   | `/api/listings`            | Admin or partner                                           | Create a full listing.                                  | `createListingSchema`, `createListingResponseSchema` |
| `GET`    | `/api/listings/:id`        | Public for published, owner/admin for private              | Get listing details.                                    | `listingParamsSchema`, `listingByIdResponseSchema`   |
| `PUT`    | `/api/listings/:id`        | Admin or owning partner                                    | Update listing data, status, images, and custom fields. | `updateListingSchema`, `updateListingResponseSchema` |
| `DELETE` | `/api/listings/:id`        | Admin or owning partner                                    | Archive a listing.                                      | `deleteListingResponseSchema`                        |
| `GET`    | `/api/listings/:id/editor` | Admin or owning partner                                    | Load editor-shaped listing data.                        | `listingEditorResponseSchema`                        |
| `POST`   | `/api/listing-drafts`      | Admin or partner                                           | Create an empty draft listing and property.             | `createDraftListingResponseSchema`                   |

Listing query parameters are documented in [Listings](listings.md).

## Image Uploads

| Method | Path                     | Auth                                                                      | Purpose                                                      |
| ------ | ------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `POST` | `/api/image-uploads`     | Admin or partner with edit access to `listingId`                          | Upload and process an image file.                            |
| `GET`  | `/api/image-uploads/:id` | Public if attached to a published listing; owner/admin for private images | Return binary image data or redirect to external `imageUrl`. |

These routes use `runtime = "nodejs"` and direct Web `Request`/`Response` handling because they process files and buffers.

Upload request:

- multipart form data
- `file`: image file
- `listingId`: UUID

Upload success response:

```json
{
  "message": "Image upload successful",
  "data": {
    "id": "uuid",
    "url": "/api/image-uploads/uuid",
    "width": 1200,
    "height": 800,
    "fileName": "photo.jpg",
    "fileType": "image/jpeg",
    "fileSize": 123456
  }
}
```

## Public Custom Listing Fields

| Method | Path                         | Auth   | Purpose                                                | Contract source                                                         |
| ------ | ---------------------------- | ------ | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| `GET`  | `/api/custom-listing-fields` | Public | List public custom listing fields grouped by category. | `customListingFieldQuerySchema`, `customListingFieldListResponseSchema` |

Supported query parameters:

- `publicOnly`
- `filterableOnly`
- `category`
- `groupId`
- `type`

The public service always starts from `is_public = true`; `publicOnly` is present for contract symmetry but does not expose private definitions.

## Admin Custom Listing Fields

| Method   | Path                                       | Auth  | Purpose                           | Contract source                                                                   |
| -------- | ------------------------------------------ | ----- | --------------------------------- | --------------------------------------------------------------------------------- |
| `GET`    | `/api/admin/custom-listing-fields`         | Admin | List admin field definitions.     | `adminCustomListingFieldQuerySchema`, `adminCustomListingFieldListResponseSchema` |
| `POST`   | `/api/admin/custom-listing-fields`         | Admin | Create a field definition.        | `createCustomListingFieldSchema`, `createCustomListingFieldResponseSchema`        |
| `GET`    | `/api/admin/custom-listing-fields/:id`     | Admin | Get one field definition.         | `customListingFieldByIdResponseSchema`                                            |
| `PUT`    | `/api/admin/custom-listing-fields/:id`     | Admin | Update a field definition.        | `updateCustomListingFieldSchema`, `updateCustomListingFieldResponseSchema`        |
| `DELETE` | `/api/admin/custom-listing-fields/:id`     | Admin | Delete a field definition.        | `deleteCustomListingFieldResponseSchema`                                          |
| `PUT`    | `/api/admin/custom-listing-fields/reorder` | Admin | Reorder all fields in a category. | `reorderCustomListingFieldsSchema`, `reorderCustomListingFieldsResponseSchema`    |

Create/update conflict behavior:

- duplicate `key` returns `409`
- missing target returns `404`
- invalid mutation returns `400`

Reorder requires the request to include every field in the target category exactly once and to use contiguous sort orders.

## Admin Accounts

| Method   | Path                         | Auth  | Purpose                                    | Contract source                                               |
| -------- | ---------------------------- | ----- | ------------------------------------------ | ------------------------------------------------------------- |
| `GET`    | `/api/admin/accounts`        | Admin | List accounts with pagination and filters. | `accountQuerySchema`, `accountListResponseSchema`             |
| `POST`   | `/api/admin/accounts`        | Admin | Invite/create an account.                  | `createAccountInviteSchema`, `createAccountResponseSchema`    |
| `GET`    | `/api/admin/accounts/:id`    | Admin | Get one account.                           | `accountByIdResponseSchema`                                   |
| `PUT`    | `/api/admin/accounts/:id`    | Admin | Update account fields.                     | `updateAccountSchema`, `updateAccountResponseSchema`          |
| `DELETE` | `/api/admin/accounts/:id`    | Admin | Deactivate an account.                     | `deactivateAccountResponseSchema`                             |
| `GET`    | `/api/admin/account-invites` | Admin | List recent pending sent invites.          | `accountInviteQuerySchema`, `accountInviteListResponseSchema` |

Account list query parameters:

- `page`
- `limit`
- `role`
- `status`
- `search`

Account safety conflicts return `409`, such as trying to remove your own admin access or deactivate yourself.

## Auth

| Method       | Path                      | Auth             | Purpose                              |
| ------------ | ------------------------- | ---------------- | ------------------------------------ |
| `GET`/`POST` | `/api/auth/[...nextauth]` | NextAuth-managed | NextAuth credentials/session routes. |

Interactive sign-in uses the server action in `app/sign-in/actions.ts`; invite acceptance uses the server action in `app/invite/actions.ts`.

## Adding Or Changing An Endpoint

1. Add or update schemas in `shared/schemas`.
2. Update `route.ts` inputs and outputs.
3. Keep `handlers.ts` focused on request/response mechanics.
4. Put business rules in a service under `lib`.
5. Put queries/transactions in a repository under `lib`.
6. Add tests for schemas, policies, specifications, or service helpers where risk justifies it.
7. Update this document.
