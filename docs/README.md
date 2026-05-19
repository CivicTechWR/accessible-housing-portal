# Developer Documentation

This directory is the developer reference for Affordable Housing Portal. It is written for new contributors who need to understand how the app fits together before changing code.

## Start Here

| Topic                                                       | Use it when                                                                                                                        |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [Getting Started](getting-started.md)                       | You need to run the app locally, configure environment variables, migrate the database, seed data, or understand scripts.          |
| [Architecture](architecture.md)                             | You need to know where code belongs, how App Router pages call services, how API handlers are structured, or how to add a feature. |
| [Domain Model](domain-model.md)                             | You need to understand Drizzle tables, status enums, relationships, custom fields, and migrations.                                 |
| [Listings](listings.md)                                     | You are changing listing search, details, authoring, draft autosave, images, or dynamic listing fields.                            |
| [Auth and Admin](auth-and-admin.md)                         | You are changing sign-in, invites, account management, role checks, protected routes, or admin custom fields.                      |
| [API Reference](api-reference.md)                           | You need endpoint behavior, auth requirements, schema locations, or error handling conventions.                                    |
| [Deployment and Operations](deployment.md)                  | You need CI, Docker, Infisical, runtime environment, migration, or release expectations.                                           |
| [Testing and Quality](testing-and-quality.md)               | You need to add tests, run checks, understand hooks, or prepare a PR.                                                              |
| [ADR 0001](adr/0001-server-first-listings-data-fetching.md) | You need the rationale for server-first listing search.                                                                            |

## System At A Glance

Affordable Housing Portal is a single Next.js App Router application. Pages, API routes, server actions, and route groups live under `app/`. Shared product UI lives under `components/`. Server-side domain logic lives under `lib/`. Database shape lives in `db/schema.ts`, with generated migrations under `drizzle/`.

The main runtime stack is:

- Next.js `16.2.6` with App Router and root-level `proxy.ts`
- React `19.2.4`
- TypeScript `6.0.2`
- Tailwind CSS 4 and shadcn/ui primitives
- NextAuth `5.0.0-beta.31` credentials provider
- Drizzle ORM with Postgres
- Zod schemas in `shared/schemas`
- `next-rest-framework` for typed route handler contracts
- Jest and React Testing Library for unit tests

## Core Request Paths

Public listing search:

```text
app/listings/page.tsx
  -> getListingsQueryFromSearchParams
  -> getListingsService
  -> listing specifications
  -> listing repository
  -> Drizzle/Postgres
  -> ListingsDashboard client refinements
```

Client-side listing refinements:

```text
components/listing-filter/*
  -> app/listings/useListingsQuery.ts
  -> GET /api/listings
  -> app/api/listings/handlers.ts
  -> getListingsService
```

Listing authoring:

```text
app/(listing-author)/listing-form/*
  -> app/listing-form/useListingForm.ts
  -> POST /api/listing-drafts when a draft is needed
  -> PUT /api/listings/:id for autosave and publish
  -> POST /api/image-uploads for image processing
```

Admin account/custom-field management:

```text
app/(admin)/admin/*
  -> admin React hooks or server-rendered pages
  -> /api/admin/*
  -> admin services
  -> admin repositories
```

## Code Ownership Map

| Area                  | Files                                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| App routes and pages  | `app/**/page.tsx`, `app/**/layout.tsx`, `app/**/loading.tsx`, `app/**/error.tsx`, `app/**/route.ts`                                                |
| Listing services      | `lib/listings/*`, `app/listings/*`, `app/listing-form/*`, `components/listing-*`, `components/listings-*`                                          |
| Auth and sessions     | `auth.ts`, `proxy.ts`, `lib/auth/*`, `components/auth/*`, `app/sign-in/*`, `app/invite/*`                                                          |
| Admin accounts        | `lib/accounts/*`, `app/(admin)/admin/users/*`, `app/(admin)/admin/invite/*`, `app/api/admin/accounts*`                                             |
| Custom listing fields | `lib/custom-listing-fields/*`, `app/admin/custom-listing-fields/*`, `app/(admin)/admin/custom-listing-fields/*`, `app/api/*custom-listing-fields*` |
| Database              | `db/schema.ts`, `db/client.ts`, `drizzle/*`, `drizzle.config.ts`, `db/seed.ts`                                                                     |
| Shared contracts      | `shared/schemas/*`                                                                                                                                 |
| Tests                 | `*.unit.test.ts`, `*.unit.test.tsx`, `test/mocks/*`, `jest.config.js`                                                                              |

## Next.js Version Note

This project uses Next.js 16, where some APIs and conventions differ from older Next.js versions. Before changing Next.js-specific code, read the relevant local guide in `node_modules/next/dist/docs/`. The most commonly relevant files are:

- `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
- `node_modules/next/dist/docs/01-app/02-guides/testing/jest.md`

## Documentation Maintenance

Update these docs when you change:

- environment variables or scripts
- route paths, request schemas, or response schemas
- database tables, columns, enums, relationships, or migration workflow
- authorization rules or role behavior
- listing search, authoring, image handling, or custom-field behavior
- CI, Docker, deployment, or runtime secret behavior
- test setup, hooks, build requirements, or deployment expectations
