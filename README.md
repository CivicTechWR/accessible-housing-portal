# Affordable Housing Portal

Affordable Housing Portal is [Civic Tech Waterloo Region](https://github.com/CivicTechWR)'s affordable housing platform. It helps housing seekers find affordable housing listings and gives housing providers a place to publish richer, more accessible listing information.

The app is a Next.js 16 App Router application using React 19, TypeScript, Tailwind CSS 4, shadcn/ui primitives, NextAuth credentials auth, Drizzle ORM, Postgres, and Zod-based API contracts.

Current product areas include:

- signed-in listing search, map/list views, and listing detail pages
- partner/admin listing authoring with draft autosave and image uploads
- partner/admin "My Listings" management
- admin account invites, account management, and custom listing fields
- listing filters powered by admin-configured listing field definitions

## Documentation

Start with [docs/README.md](docs/README.md). The developer reference is split by topic so new contributors can find the right level of detail quickly:

- [Getting Started](docs/getting-started.md) for local setup, environment variables, database setup, and scripts
- [Architecture](docs/architecture.md) for the App Router structure, service/repository boundaries, and feature workflow
- [Domain Model](docs/domain-model.md) for database tables, enums, relationships, and migration rules
- [Listings](docs/listings.md) for listing search, listing details, authoring, draft autosave, image uploads, and custom fields
- [Auth and Admin](docs/auth-and-admin.md) for NextAuth credentials auth, invites, roles, access checks, and admin tools
- [API Reference](docs/api-reference.md) for route handlers, schemas, endpoint behavior, and error responses
- [Deployment and Operations](docs/deployment.md) for CI, Docker, Infisical, runtime settings, and migration expectations
- [Testing and Quality](docs/testing-and-quality.md) for Jest, linting, formatting, hooks, and review expectations
- [ADR 0001](docs/adr/0001-server-first-listings-data-fetching.md) for the server-first listings data decision

## Quick Start

Prerequisites:

- Node.js 22.12 or newer
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

If you use the Docker Compose database from this repo, set the host port to `5433`:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/affordable_housing_portal
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

The Docker Compose workflow starts Postgres and the development app together, then runs migrations and seed data before `next dev`:

```bash
npm run docker:up
```

## Transactional Email Queue

Transactional emails, currently admin invites, are queued durably in Postgres with pg-boss instead of being sent inline. Invite creation and job enqueueing happen in the same transaction, and the worker started from `instrumentation.ts` records whether the provider accepted the request or the job permanently failed. Provider acceptance does not confirm delivery to the recipient's mail server; delivered, bounced, failed, and suppressed webhook outcomes are not currently reconciled.

Set `EMAIL_WORKER_ENABLED=true` on the long-lived app server that should process jobs. Docker Compose enables it by default. See [Auth and Admin](docs/auth-and-admin.md) for submission behavior and [Deployment and Operations](docs/deployment.md) for worker, retry, dead-letter, and secret-rotation guidance.

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

Contributions are welcomed. This repository does not currently include separate `CONTRIBUTING.md` or `CODE_OF_CONDUCT.md` files, so use the workflow below unless project maintainers provide more specific guidance.

### Choosing an Issue

Please choose work based on your availability:

- [Release-readiness tickets](https://github.com/orgs/CivicTechWR/projects/43/views/6) are time-sensitive and support our planned release. Please only pick up one of these issues if you can start soon and commit to completing it promptly, including responding to review feedback. If your availability changes, let the team know as soon as possible so the issue can be reassigned.
- [Non-urgent tickets](https://github.com/orgs/CivicTechWR/projects/43/views/7) are suitable when you cannot commit to a near-term deadline or need more flexibility to complete the work.

### Contribution Workflow

1. **Choose or create an issue.** Select an issue from the appropriate project view above, or browse [GitHub Issues](https://github.com/CivicTechWR/affordable-housing-portal/issues). Before creating an issue, check whether one already exists. Include enough detail to understand the problem, including screenshots where helpful.
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

Before opening a PR, run the relevant checks and include testing notes. The pre-commit hook runs secret scanning, `lint-staged`, and `npm run typecheck`; the pre-push hook runs `npm run build`.
