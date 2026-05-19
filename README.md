# Affordable Housing Portal

Affordable Housing Portal is [Civic Tech Waterloo Region](https://github.com/CivicTechWR)'s affordable housing platform. It helps housing seekers find affordable housing listings and gives housing providers a place to publish richer, more accessible listing information.

The app is a Next.js 16 App Router application using React 19, TypeScript, Tailwind CSS 4, shadcn/ui primitives, NextAuth credentials auth, Drizzle ORM, Postgres, and Zod-based API contracts.

Current product areas include:

- public listing search, map/list views, and listing detail pages
- partner/admin listing authoring with draft autosave and image uploads
- partner/admin "My Listings" management
- admin account invites, account management, and custom listing fields
- public filters powered by admin-configured listing field definitions

## Documentation

Start with [docs/README.md](docs/README.md). The developer reference is split by topic so new contributors can find the right level of detail quickly:

- [Getting Started](docs/getting-started.md) for local setup, environment variables, database setup, and scripts
- [Architecture](docs/architecture.md) for the App Router structure, service/repository boundaries, and feature workflow
- [Domain Model](docs/domain-model.md) for database tables, enums, relationships, and migration rules
- [Listings](docs/listings.md) for public search, listing details, authoring, draft autosave, image uploads, and custom fields
- [Auth and Admin](docs/auth-and-admin.md) for NextAuth credentials auth, invites, roles, access checks, and admin tools
- [API Reference](docs/api-reference.md) for route handlers, schemas, endpoint behavior, and error responses
- [Deployment and Operations](docs/deployment.md) for CI, Docker, Infisical, runtime settings, and migration expectations
- [Testing and Quality](docs/testing-and-quality.md) for Jest, linting, formatting, hooks, and review expectations
- [ADR 0001](docs/adr/0001-server-first-listings-data-fetching.md) for the server-first listings data decision

## Quick Start

Prerequisites:

- Node.js 22.6 or newer
- npm with the committed `package-lock.json`
- a reachable Postgres database

Install dependencies:

```bash
npm ci
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Set `DATABASE_URL` to your local database. The committed example uses:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/affordable_housing_portal
```

Apply migrations and seed local development data:

```bash
npm run db:migrate
npm run db:seed
```

Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Common Commands

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:unit
npm run build
```

Use `npm run format` and `npm run lint:fix` for mechanical fixes.

## Repository Map

```text
app/                  Pages, layouts, server actions, route handlers, and route-local UI
components/           Shared React components and shadcn/ui primitives
content/              Static content such as product verbiage
db/                   Drizzle schema, lazy database client, and seed scripts
drizzle/              Generated SQL migrations and Drizzle snapshots
docs/                 Developer documentation and ADRs
lib/                  Server-side domain services, repositories, auth, policies, and utilities
public/               Static assets served by Next.js
shared/schemas/       Zod schemas and inferred TypeScript contracts shared across layers
test/                 Test-only mocks and helpers
```

## Contributing

Development tasks are managed through [GitHub Issues](https://github.com/CivicTechWR/affordable-housing-portal/issues).

Before opening a PR, run the relevant checks and include testing notes. The pre-commit hook runs secret scanning, `lint-staged`, and `npm run typecheck`; the pre-push hook runs `npm run build`.
