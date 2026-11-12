# Testing And Quality

This project uses Jest for unit tests, the Node.js test runner for PostgreSQL integration tests, oxlint for linting, oxfmt for formatting, TypeScript strictness, and Husky hooks for local quality gates.

## Commands

| Command                    | Purpose                                                       |
| -------------------------- | ------------------------------------------------------------- |
| `npm test`                 | Run all Jest tests.                                           |
| `npm run test:unit`        | Run tests matching `.unit.test.`.                             |
| `npm run test:integration` | Run `test/integration/*.test.ts` against `TEST_DATABASE_URL`. |
| `npm run screenshots`      | Capture a full-page screenshot of every page with Playwright. |
| `npm run typecheck`        | Run `tsc --noEmit`.                                           |
| `npm run lint`             | Run oxlint.                                                   |
| `npm run lint:fix`         | Apply oxlint fixes.                                           |
| `npm run format`           | Format with oxfmt.                                            |
| `npm run format:check`     | Check formatting.                                             |
| `npm run build`            | Run a production Next.js build.                               |
| `npm run lockfile:check`   | Check package lockfile integrity.                             |

## Jest Setup

Jest is configured in `jest.config.js` with:

- `testEnvironment: "jsdom"`
- `ts-jest` transforms
- `@/*` mapped to the repository root
- `server-only` mapped to `test/mocks/server-only.ts`

The installed Next.js Jest guide notes that async Server Components are not a strong fit for Jest. Prefer focused tests around schemas, services, policies, specifications, hooks, and pure mapping functions. Use broader browser or end-to-end coverage when async Server Component behaviour needs confidence.

## Playwright Screenshots

`npm run screenshots` captures every page at desktop (1440×900) and mobile (Pixel 7) sizes. One-time setup:

```bash
npx playwright install chromium
docker compose up -d db
```

Playwright starts its own `next dev` server on port 3100 (`E2E_PORT`) with `.next-review` as its build directory, so it can run beside `npm run dev`. It never reuses a server already on that port, so stop any leftover one first. Before the server starts, `e2e/prepare-database.ts` creates, migrates, and seeds a separate `homehub_auth_review` database on the Compose Postgres (`127.0.0.1:5433`). It also seeds review accounts with a test-only password and a pending invite. Set `E2E_DATABASE_URL` to use a different local Postgres. It must stay a local database named `homehub_auth_review`.

`e2e/auth.setup.ts` signs in once each as a searcher, a partner, and an admin through the sign-in form. Each page in `e2e/pages.ts` is captured as the role that can open it. The test fails if a protected page redirects to sign-in. Screenshots are written to `e2e/screenshots/<desktop|mobile>/<page>.png` and attached to the HTML report (`npx playwright show-report e2e/report`). The screenshots are committed so reviewers can see every page; re-run `npm run screenshots` and commit the changed images when a page's appearance changes. The report is git-ignored, and `.dockerignore` keeps `e2e/` out of the production image.

`e2e/fixtures.ts` replaces every browser request that leaves the app, so screenshots are stable and need no network. Listing photos and other outside images get a local placeholder, the OpenFreeMap style gets a blank background (listing markers still render), and all other outside requests are blocked. Page data still comes from the seeded database.

CI runs the suite in the `Playwright Screenshots` job against a `homehub_auth_review` Postgres service. The screenshots and HTML report are uploaded as the `playwright-screenshots` artifact on each run.

When you add a page under `app/`, add it to `e2e/pages.ts`. Admin screens aren't designed for mobile, so they set `desktopOnly: true` and are captured at desktop size only.

## Existing Test Patterns

Current tests cover:

- custom listing field ordering
- listing custom field mapping and submitted feature id handling
- listing specifications
- route policy matching
- address utilities
- listing form schemas and API mapping
- listing apply-button confirmation and no-URL fallback behaviour
- listing detail utilities display behaviour
- custom listing field dashboard utilities
- listing filter hooks/components
- price range input behaviour
- transactional email provider error classification and idempotency
- queue enqueueing, deduplication, retry configuration, and worker startup gating
- quota/rate-limit deferral, dead-letter handling, and invite submission status mapping
- queued-secret encryption, redaction, and plaintext-sensitive-data prevention

Test naming convention:

```text
*.unit.test.ts
*.unit.test.tsx
```

## What To Test

Add focused tests when changing:

- Zod schemas in `shared/schemas`
- policy functions in `lib/policies`
- route matching in `lib/auth/route-policy.ts`
- Drizzle specification builders in `lib/*/*.specifications.ts`
- mappers between form data, API payloads, and persistence
- money/date conversion logic
- custom-field ordering or display behaviour
- hooks with non-trivial state transitions

Database integration tests use `node --test` with `--conditions=react-server` and `tsx`. Set `TEST_DATABASE_URL` to a disposable PostgreSQL database before running `npm run test:integration`. The tests apply the committed migrations and exercise authentication concurrency, email delivery, and listing feature persistence and filtering. Test files run sequentially because they share the database's migration history. Without `TEST_DATABASE_URL`, the integration suite is skipped. CI supplies a dedicated PostgreSQL service and runs both test commands.

Use this integration pattern for behaviour that depends on database transactions or locking. Keep pure business logic in focused unit tests.

## Hooks

The local hooks are:

- `.husky/pre-commit`
- `.husky/pre-push`

Pre-commit runs:

```bash
node_modules/.bin/gitleaks-secret-scanner
npx lint-staged
npm run typecheck
```

Pre-push runs:

```bash
npm run build
```

These hooks are not a substitute for running targeted tests while developing.

## CI

GitHub Actions runs lockfile, lint, format, test, and build jobs for pull requests to `main` and pushes to `main` or `rewrite`. See [Deployment and Operations](deployment.md) for the exact workflow shape.

## Review Checklist

Before opening a PR:

1. Run the checks relevant to the change.
2. Include testing notes in the PR description.
3. Confirm schemas and docs are updated for changed contracts.
4. Confirm migrations are included for schema changes.
5. Confirm protected behaviour has service-level authorization.
6. Confirm new Client Components do not import server-only modules.
7. Confirm new server SDK/database clients use lazy initialization.

## Documentation Checks

There is no dedicated markdown linter. Treat docs like code:

- keep commands copy-pastable
- link to owning files when possible
- update docs in the same PR as behaviour changes
- remove stale setup instructions when scripts or Docker behaviour changes
