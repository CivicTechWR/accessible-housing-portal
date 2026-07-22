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

- [Node.js](https://nodejs.org/) 22.12+
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

## Transactional Email Queue

Transactional emails (currently admin invites) are not sent inline. Feature code enqueues a durable [pg-boss](https://github.com/timgit/pg-boss) job in the same Postgres transaction that writes the business records, and an in-process worker is the only caller of the shared `sendEmail()` service (`lib/email.ts`). pg-boss stores jobs in its own `pgboss` schema, which it creates and migrates automatically on first start — no drizzle migration is involved.

- **Worker startup**: `instrumentation.ts` `register()` starts the worker, gated on `EMAIL_WORKER_ENABLED=true` in addition to the Node.js runtime check, so builds, CI, tests, and scripts never start pollers. Set `EMAIL_WORKER_ENABLED=true` wherever the long-lived server runs (it is preset in `docker-compose.yml`, and must be set in the Infisical prod environment for deployments); leave it unset everywhere else. Without it the app still enqueues jobs, but nothing sends them.
- **Delivery semantics**: a successful request means the email is _queued_, not sent. The worker retries transient provider failures with bounded exponential backoff, honors `Retry-After` on rate limits, defers jobs ~24 hours when Resend's daily quota is exhausted, and moves permanently failing jobs to the `email_send_dead_letter` queue (monthly quota exhaustion ends up there too, after logging an error). Quota deferrals do not burn retries but are capped per logical email (`MAX_EMAIL_JOB_DEFERRALS` in `lib/email-queue/worker.ts`); a job that keeps hitting provider limits past the cap also dead-letters. The worker also works the dead letter queue: it records the permanent failure on the source entity (for invites, `emailFailedAt`), so admin invite lists distinguish `queued` (job enqueued), `submitted` (Resend accepted the API request and the worker set the legacy `sentAt` field), `failed` (job dead-lettered before provider acceptance; re-send the invite), and `not_requested` (no email asked for; the invite URL is shared manually). `submitted` does not confirm acceptance by the recipient's mail server: this app does not currently reconcile Resend's delivered, bounced, failed, or suppressed webhook events. Dead-lettered job rows stay queryable for operational follow-up.
- **Sensitive payloads**: raw one-time tokens and invite URLs are never stored in plaintext job payloads. They are sealed with AES-256-GCM under a key derived from `AUTH_SECRET` (`lib/email-queue/email-job.ts`) and, once the logical email reaches a terminal outcome (submitted, skipped, or dead-lettered with the failure recorded), redacted from every settled job row for that email — quota-deferral ancestors, the failed source row, and dead-letter copies included. Until then, a quota-deferred job passes a copy of its still-sealed payload to the replacement job, and both rows keep it so a crash-recovered attempt can still send. Note that rotating `AUTH_SECRET` makes already-queued sealed payloads undecryptable; those jobs will dead-letter, the affected invites are marked `failed`, and they must be re-sent.
- **Adding an email type**: extend `EmailJobData` in `lib/email-queue/email-job.ts` (entity reference + sealed secret if needed, plus a priority) and add a matching send handler and dead-letter failure-recording case in `lib/email-queue/worker.ts`. Do not add another delivery path around the queue.

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

## Architecture Notes

- Public listing search is server-first: `app/listings/page.tsx` calls shared listing services directly for the initial render, while client-side filter refinements fetch `/api/listings`.
- Route handlers should remain thin and delegate business logic to services under `lib/`.
- `auth.ts` and `proxy.ts` provide broad session gating and sign-in redirects for protected routes. Page, server action, service, and API code must still enforce role-specific authorization with shared auth/session and policy helpers.
- Keep cross-boundary contracts in `shared/schemas/` so page code, services, route handlers, and tests use the same validation rules.

## Contributing

Contributions are welcomed. This repository does not currently include separate `CONTRIBUTING.md` or `CODE_OF_CONDUCT.md` files, so use the workflow below unless project maintainers provide more specific guidance.

### Contribution Workflow

1. **Choose or create an issue.** Development tasks are managed through [GitHub Issues](https://github.com/CivicTechWR/affordable-housing-portal/issues). Before creating an issue, check whether one already exists. Include enough detail to understand the problem, including screenshots where helpful.
2. **Assign the issue to yourself.** This lets other contributors know that the work is in progress. If you cannot assign yourself, leave a comment asking a maintainer to assign it to you.
3. **Clarify the requirements.** Read the issue and any related discussion before starting. If the expected behaviour, scope, or design is unclear, ask questions on the issue and wait for clarification where the answer could materially change the implementation.
4. **Create a branch.** Start from an up-to-date `main` branch and name the new branch using the issue number and a short, lowercase, hyphenated version of its title. For example: `123-improve-listing-filters`.
5. **Implement and verify the change.** Keep the work focused on the issue. Add or update tests where appropriate, and run the relevant development commands listed above.
6. **Open a pull request.** Push the branch and open a PR against `main`. Link the issue (for example, `Closes #123`), explain what changed, and include testing notes and screenshots when the change affects the UI.
7. **Request a review.** Request a reviewer on GitHub. If you are unsure who should review it or the PR is waiting for attention, share it in the project Slack channel and ask for a reviewer.
8. **Address feedback.** Respond to review comments, push follow-up commits to the same branch, and let reviewers know when the PR is ready for another look.

### Example

Suppose you want to work on issue `#123`, **Improve listing filters**:

1. Assign issue `#123` to yourself and comment with any questions that need clarification.
2. Create the branch from the latest `main`:

   ```bash
   git switch main
   git pull --ff-only
   git switch -c 123-improve-listing-filters
   ```

3. Make the change, add tests, and run the relevant checks:

   ```bash
   npm run lint
   npm run format:check
   npm test
   npm run build
   ```

4. Commit and push the branch:

   ```bash
   git add <changed-files>
   git commit -m "Improve listing filters"
   git push -u origin 123-improve-listing-filters
   ```

5. Open a PR against `main` with a summary, testing notes, and `Closes #123` in the description. Request a reviewer on GitHub, or post the PR link in Slack to ask for review.

### Committing

The Husky pre-commit hook runs secret scanning, `lint-staged`, and `npm run typecheck`. The pre-push hook runs `npm run build`.

### Pull Requests

Pull requests are opened to the `main` branch. The CI workflow currently runs:

- `npm run lint`
- `npm run format:check`
- `npm test`
- `npm run build`

When opening a PR, include the related issue, a description of the change, and testing notes for reviewers.
