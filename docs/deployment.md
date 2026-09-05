# Deployment and operations

Run HomeHub on Railway as a long-lived Next.js server with PostgreSQL and the email worker enabled. Production and staging use separate databases, secrets, and public origins.

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
2. Runs `npm ci`.
3. Copies the repository.
4. Runs `npm run build`.
5. Sets `NODE_ENV=production` and `PORT=3100`.
6. Starts the Next.js server using the injected `PORT` and environment variables.

## Docker Compose

`docker-compose.yml` is a local development stack. It currently defines:

- `db`, a `postgres:16-alpine` container named `ahp-db`
- `app`, a Next.js development container named `ahp-app`

The database service:

- creates the `affordable_housing_portal` database
- uses `postgres` / `postgres` local credentials
- exposes `${POSTGRES_PORT:-5433}:5432`
- stores data in the `ahp-postgres-data` volume
- includes a `pg_isready` healthcheck

The app service:

- builds from `Dockerfile.dev`
- waits for the database healthcheck
- mounts the repository into `/app`
- exposes `3000:3000`
- reads local authentication and email configuration
- sets `EMAIL_WORKER_ENABLED=true` so the development server processes queued email
- runs `npm run db:migrate && npm run db:seed && npm run dev -- --hostname 0.0.0.0 --port 3000`

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

The Docker Compose `app` service builds from `Dockerfile.dev` and overrides its default command to run migrations and seeds before `next dev`.

## Railway configuration

Run a long-lived Node.js process with PostgreSQL and `EMAIL_WORKER_ENABLED=true`. Set the build command to `npm run build` and start command to `npm run start -- --hostname 0.0.0.0 --port $PORT`. Apply `npm run db:migrate` as an explicit release step against the intended database. Do not seed mock listings in production.

| Setting                          | Production                     | Staging                              |
| -------------------------------- | ------------------------------ | ------------------------------------ |
| `BETTER_AUTH_URL`                | `https://homehub.unionsd.coop` | `https://affordablehousing.ctwr.org` |
| Passkey RP ID, derived from URL  | `homehub.unionsd.coop`         | `affordablehousing.ctwr.org`         |
| Trusted origin, derived from URL | `https://homehub.unionsd.coop` | `https://affordablehousing.ctwr.org` |

Use distinct `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `EMAIL_JOB_SECRET` values for each environment. Both secrets need at least 32 random characters. Set `EMAIL_TRANSPORT=resend`, `RESEND_API_KEY`, and an `EMAIL_FROM` address on a Resend-verified domain. Captured email is only for local development.

Configure each custom domain and its TLS certificate in Railway. Add only the DNS records Railway supplies for the selected service. For email, configure the sender-domain verification records supplied by Resend, including DKIM and SPF, and choose an appropriate DMARC policy. The web domain and sender domain need not be the same.

The application uses a fixed public origin and host-only cookies. Keep production and staging cookies separate. Do not add wildcard trusted origins, cross-domain cookies, or forwarded-host trust. Rate limiting reads Railway's `X-Real-IP` header. Keep the service behind Railway's edge; any additional proxy must preserve the original Origin and supply a trustworthy client IP. See [Railway request headers](https://docs.railway.com/networking/public-networking/specs-and-limits).

Passkeys require HTTPS outside localhost. Because these hostnames have different registrable domains, users enroll passkeys separately on each. Use `http://localhost:<port>` consistently for local development rather than alternating between localhost and 127.0.0.1.

The Dockerfile starts Node directly and uses Railway's injected variables. The optional `*:secrets` scripts remain available for explicit Infisical workflows.

## Migrations

The production Docker image does not automatically run migrations. Apply migrations explicitly before or during release with the environment pointed at the target database.

The local Docker Compose app service does run migrations and seeds on startup against the Compose Postgres service.

Available commands:

```bash
npm run db:migrate
npm run db:migrate:secrets
```

Use `db:migrate:secrets` when Infisical `dev` secrets are the intended target. For production, verify the Infisical environment and database target before running migrations.

The `user_invites.email_queued_at` and `email_failed_at` columns are managed through the committed Drizzle migration. pg-boss separately creates and migrates its own `pgboss` schema when the queue starts; do not generate a Drizzle migration for that schema.

## Transactional Email Worker

`instrumentation.ts` starts the in-process pg-boss worker only in the Node.js runtime and only when `EMAIL_WORKER_ENABLED=true`. Enable it on the long-lived application server. If every process leaves the variable unset, requests can still enqueue jobs but no process will submit them to the provider.

The worker retries transient provider failures with bounded exponential backoff, honors `Retry-After`, and defers daily quota failures without consuming retries. Permanent failures and exhausted retry/deferral chains enter `email_send_dead_letter`; the dead-letter worker records the failure on the source invite so the admin UI can surface it.

Monitor server logs for `[email-queue]` errors and inspect the pg-boss queues when invites remain queued. Treat `EMAIL_JOB_SECRET` rotation as an operational migration: queued invite URLs are encrypted with a derived key, so drain or replace outstanding jobs before rotating it.

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
3. Required secrets, including `EMAIL_WORKER_ENABLED=true` on the worker process, exist in the target Railway environment.
4. `BETTER_AUTH_URL` matches the public deployment URL.
5. Invite email settings are valid and the worker starts successfully if account invites will send email.
6. The container is started with the intended `PORT`.
7. Smoke test sign-in, listing search, listing detail, admin access, image retrieval, and invite submission status from queued to submitted or failed.
