# Deployment And Operations

This project currently has CI, a production-oriented Dockerfile, a development Dockerfile, and Infisical-backed secret commands. There is no documented one-command production deployment in the repository, so treat this file as the operational reference for what the repo itself defines.

## CI

GitHub Actions workflow: `.github/workflows/ci.yml`.

Triggers:

- pull requests targeting `main`
- pushes to `main`
- pushes to `rewrite`
- manual workflow dispatch

Jobs:

| Job                   | Commands                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------- |
| Supply Chain Lockfile | `npm ci`, `npm run lockfile:check`, `git diff --exit-code -- package.json package-lock.json` |
| Lint                  | `npm ci`, `npm run lint`                                                                     |
| Format Check          | `npm ci`, `npm run format:check`                                                             |
| Tests                 | `npm ci`, `npm run test`                                                                     |
| Build                 | `npm ci`, `npm run build`                                                                    |

CI uses Node 22 with npm cache enabled.

## Dockerfile

`Dockerfile` is production-oriented:

1. Starts from `node:22.14.0-slim`.
2. Installs `openssl`, `curl`, `bash`, `ca-certificates`, and Infisical CLI.
3. Runs `npm ci`.
4. Copies the repository.
5. Runs `npm run build`.
6. Sets `NODE_ENV=production` and `PORT=3100`.
7. Starts through `infisical run --env=prod --projectId=2980a086-4367-4a1a-aafd-d1f5d4879253`.

The container command runs:

```bash
npm run start -- --hostname 0.0.0.0 --port ${PORT}
```

## Docker Compose

`docker-compose.yml` currently defines one service:

- service name: `ahp`
- container name: `ahp`
- build context: `.`
- restart policy: `unless-stopped`
- port binding: `127.0.0.1:${PORT:-3100}:${PORT:-3100}`
- environment: `INFISICAL_TOKEN`, `PORT`, `AUTH_TRUST_HOST=true`

It does not define a Postgres container and does not run migrations or seeds.

Commands:

```bash
npm run docker:up
npm run docker:logs
npm run docker:down
npm run docker:down:volumes
```

## Development Dockerfile

`Dockerfile.dev` is a development image:

- starts from `node:22.14.0-slim`
- runs `npm ci`
- copies the repo
- exposes port 3000
- runs `npm run dev -- --hostname 0.0.0.0 --port 3000`

There is no compose service wired to `Dockerfile.dev` at the time of writing.

## Runtime Environment

Production runtime needs the same app-level variables described in [Getting Started](getting-started.md), usually supplied by Infisical:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL` and/or `AUTH_URL`
- `RESEND_API_KEY` and `EMAIL_FROM` if invite emails are sent
- `AUTH_TRUST_HOST=true` when running behind a trusted proxy/container host
- optional `ADMIN_EMAIL` and `ADMIN_PASSWORD` only for bootstrap/recovery workflows

The Docker Compose service additionally requires `INFISICAL_TOKEN` so the container can read Infisical secrets.

## Migrations

The Docker image does not automatically run migrations. Apply migrations explicitly before or during release with the environment pointed at the target database.

Available commands:

```bash
npm run db:migrate
npm run db:migrate:secrets
```

Use `db:migrate:secrets` when Infisical `dev` secrets are the intended target. For production, verify the Infisical environment and database target before running migrations.

## Build-Safe Server Code

`next build` evaluates modules. Server clients that require runtime secrets should be lazily initialized. The database client already follows this pattern in `db/client.ts`.

When adding new server integrations:

- do not create SDK clients at module scope if they require environment variables
- expose a getter or lazy proxy
- fail with a clear error only when the integration is actually used
- keep integration code in server-only modules

## Release Checklist

1. CI is green.
2. Database migrations are reviewed and applied to the target database.
3. Required secrets exist in the target Infisical environment.
4. `NEXT_PUBLIC_APP_URL`/`AUTH_URL` match the public deployment URL.
5. Invite email settings are valid if account invites will send email.
6. The container is started with the intended `PORT`.
7. Smoke test sign-in, listing search, listing detail, admin access, and image retrieval.
