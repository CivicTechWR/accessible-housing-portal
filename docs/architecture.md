# Architecture

This app is a Next.js 16 App Router project. Next.js 16 renamed Middleware to Proxy and has App Router conventions that differ from older versions, so use the installed docs in `node_modules/next/dist/docs/` as the source of truth before changing framework-specific code.

## High-Level Shape

```text
Browser
  -> App Router page/layout/client component
  -> optional server action or API route handler
  -> Zod schema validation
  -> domain service
  -> repository/specification helpers
  -> Drizzle ORM
  -> Postgres
```

The project keeps HTTP, UI, business rules, persistence, and shared contracts in distinct layers.

| Layer                    | Owns                                                     | Examples                                                                           |
| ------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| App Router pages/layouts | URL structure, server rendering, route-level access UI   | `app/listings/page.tsx`, `app/(admin)/admin/layout.tsx`                            |
| Client components/hooks  | Browser interactivity, forms, query state, optimistic UX | `app/listings/listings.tsx`, `app/listing-form/useListingForm.ts`                  |
| Route handlers           | HTTP method binding, request parsing, response status    | `app/api/listings/route.ts`, `app/api/listings/handlers.ts`                        |
| Shared schemas           | Runtime validation and inferred TypeScript contracts     | `shared/schemas/listings.ts`, `shared/schemas/account-management.ts`               |
| Services                 | Use cases, authorization checks, domain composition      | `lib/listings/listing.service.ts`, `lib/accounts/account.service.ts`               |
| Repositories             | Drizzle queries and transactions                         | `lib/listings/listing.repository.ts`, `lib/accounts/account.repository.ts`         |
| Specifications           | Reusable query predicates                                | `lib/listings/listing.specifications.ts`, `lib/accounts/account.specifications.ts` |
| Policies                 | Role and ownership decisions                             | `lib/policies/listing-policy.ts`, `lib/policies/account-policy.ts`                 |
| Database schema          | Tables, enums, indexes, inferred row types               | `db/schema.ts`                                                                     |

## App Router Conventions

Top-level routing code lives in `app/`.

- `page.tsx` exposes a route.
- `layout.tsx` wraps a route segment and its children.
- `loading.tsx`, `error.tsx`, and `not-found.tsx` provide segment-level states.
- `route.ts` exposes an API Route Handler.
- Route groups such as `(admin)` and `(listing-author)` organize code without changing the URL.

Examples:

| File                                              | URL                 |
| ------------------------------------------------- | ------------------- |
| `app/page.tsx`                                    | `/`                 |
| `app/listings/page.tsx`                           | `/listings`         |
| `app/listings/[id]/page.tsx`                      | `/listings/:id`     |
| `app/(listing-author)/listing-form/page.tsx`      | `/listing-form`     |
| `app/(listing-author)/listing-form/[id]/page.tsx` | `/listing-form/:id` |
| `app/(admin)/admin/users/page.tsx`                | `/admin/users`      |
| `app/api/listings/route.ts`                       | `/api/listings`     |

Components are Server Components by default. Add `"use client"` only for components that need browser APIs, event handlers, local state, React Hook Form, React Query, or `useEffect`.

## Server-First Listings

The listings page follows [ADR 0001](adr/0001-server-first-listings-data-fetching.md). Initial listing data is loaded on the server:

```text
app/listings/page.tsx
  -> getListingsService(query)
  -> findListingSummaries(...)
```

After hydration, browser-driven filter changes use React Query through `/api/listings`. The API handler calls the same `getListingsService`, so server render and client refetches share filtering and visibility rules.

## Route Handler Pattern

Most API routes use `next-rest-framework`:

```text
route.ts
  -> declares methods, input schemas, output schemas, statuses
handlers.ts
  -> reads request data
  -> calls service
  -> maps DomainResult errors
service.ts
  -> owns business behavior
```

Keep route handlers thin. Do not put Drizzle queries or business rules directly in handlers.

Binary image upload routes are the exception. They use direct `Request`/`Response` handlers with `runtime = "nodejs"` because they process multipart files and image buffers.

## Service And Repository Boundary

Services answer use-case questions:

- Can this actor do this?
- Which repository operations need to happen together?
- How should domain errors be represented?
- How should persisted data map to response contracts?

Repositories answer persistence questions:

- What tables are queried?
- Which joins, filters, sort orders, and transactions are needed?
- What fields are selected or updated?

Specifications keep reusable Drizzle predicates out of services so filters stay testable and composable.

## Shared Contracts

Use `shared/schemas/*.ts` for data crossing a boundary:

- API query parameters
- API request bodies
- API response bodies
- form payloads that map to API payloads
- route params

Pattern:

```ts
export const exampleSchema = z.object({ ... })
export type Example = z.infer<typeof exampleSchema>
```

When an endpoint changes, update the schema first, then route outputs, handlers, services, UI callers, tests, and documentation.

## Auth And Authorization

Auth is deliberately layered:

- `auth.ts` configures NextAuth credentials, JWT session state, and broad authorization.
- `proxy.ts` exports the NextAuth proxy so protected requests can be redirected or rejected early.
- Route-group layouts such as `app/(admin)/admin/layout.tsx` and `app/(listing-author)/layout.tsx` enforce route-level UI access.
- API handlers and services call `requireAdminSession`, `requireListingWriteSession`, or `getOptionalSession` as needed.
- Policies in `lib/policies/*` make role and ownership decisions.

The proxy is not the only authorization layer. Any page, server action, service, or API endpoint that exposes protected behavior must enforce its own role-specific rules.

## Client State

The root layout wraps the app in `QueryProvider`, which creates a TanStack Query client with:

- `refetchOnWindowFocus: false`
- `retry: 1`
- `staleTime: 30_000`

Current listing filters use `nuqs` to keep query state URL-driven. React Query handles browser refetches after the initial server render.

## Database Client

`db/client.ts` exports `db` as a lazy proxy around Drizzle and `postgres`. This avoids opening a database connection at module import time and keeps Next build-time module evaluation safer.

If you add another server SDK or database client, use a lazy getter or proxy pattern rather than initializing it at module scope.

## Adding A Feature

Use this workflow for most product changes:

1. Identify the domain area and current owner files.
2. Add or update Zod schemas in `shared/schemas` for any changed boundary contract.
3. Update `db/schema.ts` and generate a migration if persistence changes.
4. Add repository methods for new queries or transactions.
5. Add service methods for business rules and authorization.
6. Add or update route handlers if the behavior is exposed over HTTP.
7. Add or update pages, components, hooks, or server actions.
8. Add focused tests for pure logic, schemas, policies, specifications, and risky mappings.
9. Update docs when behavior, setup, routes, schemas, or data model change.

## Common Pitfalls

- Putting queries directly in components or route handlers instead of repositories.
- Duplicating validation outside `shared/schemas`.
- Trusting `proxy.ts` as the only authorization check.
- Importing server-only modules into Client Components.
- Initializing Postgres, Resend, or other server clients at module scope.
- Changing `db/schema.ts` without generating a migration.
- Adding listing fields without deciding whether they belong in normalized columns, `customFields`, or `listing_field_definitions`.
