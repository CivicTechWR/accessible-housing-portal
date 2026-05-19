# Testing And Quality

This project uses Jest for tests, oxlint for linting, oxfmt for formatting, TypeScript strictness, and Husky hooks for local quality gates.

## Commands

| Command                    | Purpose                                  |
| -------------------------- | ---------------------------------------- |
| `npm test`                 | Run all Jest tests.                      |
| `npm run test:unit`        | Run tests matching `.unit.test.`.        |
| `npm run test:integration` | Run tests matching `.integration.test.`. |
| `npm run typecheck`        | Run `tsc --noEmit`.                      |
| `npm run lint`             | Run oxlint.                              |
| `npm run lint:fix`         | Apply oxlint fixes.                      |
| `npm run format`           | Format with oxfmt.                       |
| `npm run format:check`     | Check formatting.                        |
| `npm run build`            | Run a production Next.js build.          |
| `npm run lockfile:check`   | Check package lockfile integrity.        |

## Jest Setup

Jest is configured in `jest.config.js` with:

- `testEnvironment: "jsdom"`
- `ts-jest` transforms
- `@/*` mapped to the repository root
- `server-only` mapped to `test/mocks/server-only.ts`

The installed Next.js Jest guide notes that async Server Components are not a strong fit for Jest. Prefer focused tests around schemas, services, policies, specifications, hooks, and pure mapping functions. Use broader browser or end-to-end coverage when async Server Component behavior needs confidence.

## Existing Test Patterns

Current tests cover:

- custom listing field ordering
- listing custom field mapping and legacy feature handling
- listing specifications
- route policy matching
- address utilities
- listing form schemas and API mapping
- custom listing field dashboard utilities
- listing filter hooks/components
- price range input behavior

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
- custom-field ordering or display behavior
- hooks with non-trivial state transitions

Repository methods that require a real database should usually be covered by integration tests once an integration test database pattern exists. Until then, keep business logic in services/helpers where it can be unit tested without a database.

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
5. Confirm protected behavior has service-level authorization.
6. Confirm new Client Components do not import server-only modules.
7. Confirm new server SDK/database clients use lazy initialization.

## Documentation Checks

There is no dedicated markdown linter. Treat docs like code:

- keep commands copy-pastable
- link to owning files when possible
- update docs in the same PR as behavior changes
- remove stale setup instructions when scripts or Docker behavior changes
