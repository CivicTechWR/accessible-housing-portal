# Affordable Housing Portal

Affordable Housing Portal is [Civic Tech Waterloo Region](https://github.com/CivicTechWR)'s affordable housing platform. It aims to make it easier for housing seekers to find and access listings from affordable housing providers. Many existing platforms fail to centre the needs of marginalized communities — key information is often missing, and listings can be structured in ways that discourage these communities from applying. This project seeks to address those gaps with a more accessible and equitable experience.

## Overview

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white) ![Next JS](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

The platform is a [Next.js](https://nextjs.org) App Router application using React 19, [Tailwind CSS](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com) components, NextAuth credentials auth, Drizzle ORM, and Postgres.

Current user-facing areas include:

- public listing search and listing detail pages
- partner/admin listing authoring, draft autosave, image uploads, and "My Listings"
- admin user invites and account management
- admin-configurable custom listing fields that can drive public filters

## Repository Structure

```
app/                  → Pages, layouts, server actions, and API route handlers
├── admin/            → Admin account and custom listing field pages
├── api/
│   ├── admin/        → Admin account, invite, and custom field endpoints
│   ├── auth/         → NextAuth route handler
│   ├── custom-listing-fields/
│   ├── image-uploads/
│   ├── listing-drafts/
│   └── listings/     → Listing read/write endpoints
├── listing-form/     → Create/edit listing workflow
├── listings/         → Public listing browse/search and detail pages
├── my-listings/      → Partner/admin listing management
├── sign-in/          → Credentials sign-in
└── page.tsx          → Redirects housing seekers to /listings

components/           → React components
├── ui/               → shadcn/ui primitives (button, card, input, etc.)
├── listing-form-*    → Listing authoring form sections
├── listing-filter*/  → Search and filter controls
├── listings-panel/   → Listing results panel
├── map-view/         → Map display
├── site-header/      → Header and account menu
└── ...               → Other shared components

db/                   → Drizzle schema, client, and seed data
drizzle/              → Generated SQL migrations and snapshots
lib/                  → Domain services, repositories, auth, policies, utilities
shared/               → Shared runtime schemas and TypeScript types
test/                 → Test-only mocks and helpers
```

## Shared Schemas and Types

Use `shared/schemas/*.ts` for contracts that must stay consistent across frontend and backend code.

- Define request/response contracts once with `zod`.
- Export inferred TypeScript types with `z.infer<typeof schema>`.
- API route handlers use these schemas with `next-rest-framework` where applicable.

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 22.6+
- npm, using the committed lockfile

### Install Dependencies

```bash
npm ci
```

### Run Locally

Copy the example environment file and set values as needed:

```bash
cp .env.example .env.local
```

For a local Postgres instance, `DATABASE_URL` must point at that database. If you use the Docker Compose database from this repo, the host port is `5433` by default:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/affordable_housing_portal
```

Install dependencies, then run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Run Backend Stack with Docker

This repo includes a local backend stack with:

- Next.js app server (API routes + frontend)
- Postgres database
- Automatic DB migration + seed on container startup

```bash
npm run docker:up
```

Then open [http://localhost:3000](http://localhost:3000).
Postgres is exposed on `localhost:5433` by default (override with `POSTGRES_PORT`).

Useful commands:

```bash
npm run docker:logs
npm run docker:down
npm run docker:down:volumes
```

## Database

The app includes a Drizzle + Postgres schema for users, invites, properties, listings, listing images, saved listings, saved searches, and admin-configurable listing fields.

1. Copy `.env.example` to `.env.local` or provide `DATABASE_URL` through Infisical.
2. Generate migrations after schema changes with `npm run db:generate`.
3. Apply migrations with `npm run db:migrate`.
4. Inspect the schema with `npm run db:studio`.
5. Seed local data with `npm run db:seed`.

When using Docker Compose, `db:migrate` and `db:seed` are run automatically when the app container starts.

If you set `ADMIN_PASSWORD`, the app enables a one-time bootstrap admin sign-in for `ADMIN_EMAIL` (default `admin@example.com`) until an admin user has a stored local password. This is intended for first-run setup and local/dev recovery from external-auth-only data.

## Development Commands

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:unit
npm run test:integration
```

Use `npm run format` and `npm run lint:fix` for automatic formatting and lint fixes.

## Transactional Email

Transactional email (account invites today) is delivered through a Postgres-backed job queue with retries, idempotent sends, and encrypted handling of one-time URLs — feature code never calls Resend directly. See [docs/email-queue.md](docs/email-queue.md) for the design and for worker setup in local dev (`npm run email:worker`), Docker (`docker compose --profile worker up`), and deployment (`vercel.json` schedules a cron against `/api/cron/email-jobs` authorized by `CRON_SECRET`; self-hosted deployments run the polling worker or system cron instead).

## Architecture Notes

- Public listing search is server-first: `app/listings/page.tsx` calls shared listing services directly for the initial render, while client-side filter refinements fetch `/api/listings`.
- Route handlers should remain thin and delegate business logic to services under `lib/`.
- `auth.ts` and `proxy.ts` provide broad session gating and sign-in redirects for protected routes. Page, server action, service, and API code must still enforce role-specific authorization with shared auth/session and policy helpers.
- Keep cross-boundary contracts in `shared/schemas/` so page code, services, route handlers, and tests use the same validation rules.

## Contributing

Contributions are welcomed. This repository does not currently include separate `CONTRIBUTING.md` or `CODE_OF_CONDUCT.md` files, so use the workflow below unless project maintainers provide more specific guidance.

### Issue Tracking

Development tasks are managed through [GitHub Issues](https://github.com/CivicTechWR/affordable-housing-portal/issues). Please feel free to submit issues even if you don't plan on implementing them yourself. Before creating an issue, check first to see if one already exists. Include as much information as possible, including screenshots where helpful.

### Committing

The Husky pre-commit hook runs secret scanning, `lint-staged`, and `npm run typecheck`. The pre-push hook runs `npm run build`.

### Pull Requests

Pull requests are opened to the `main` branch. The CI workflow currently runs:

- `npm run lint`
- `npm run format:check`
- `npm test`
- `npm run build`

When opening a PR, include the related issue, a description of the change, and testing notes for reviewers.
