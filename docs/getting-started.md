# Getting Started

This guide covers local setup, environment variables, database setup, scripts, and common troubleshooting.

## Prerequisites

- Node.js `22.12.0` or newer. The project currently builds its production image from `node:22.14.0-slim`.
- npm. Use the committed `package-lock.json` with `npm ci`.
- Postgres. Local development expects a reachable database through `DATABASE_URL`.
- Optional: Infisical for deployed/prod-like secrets.
- Optional: Resend credentials if you want the email worker to submit invite emails.

## Install Dependencies

```bash
npm ci
```

Do not use `npm install` for routine setup unless you intentionally need to update dependencies and the lockfile.

## Environment Variables

Create a local env file:

```bash
cp .env.example .env.local
```

Variables used by the app:

| Variable               | Required                    | Used by                                 | Notes                                                                               |
| ---------------------- | --------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------- |
| `DATABASE_URL`         | Yes                         | Drizzle, app services, migrations, seed | Must point at Postgres. `drizzle.config.ts` loads `.env.local` and then `.env`.     |
| `AUTH_SECRET`          | Yes                         | NextAuth, queued-secret encryption      | Use a random secret and do not rotate it while email jobs are queued.               |
| `RESEND_API_KEY`       | Email worker processes only | `lib/email.ts`                          | Required when the worker submits a queued invite email to Resend.                   |
| `EMAIL_FROM`           | Email worker processes only | `lib/email.ts`                          | Sender address used when the worker submits an email to Resend.                     |
| `EMAIL_WORKER_ENABLED` | Worker processes only       | `instrumentation.ts`, email queue       | Set to `true` only on a long-lived server that should process queued email.         |
| `NEXT_PUBLIC_APP_URL`  | Recommended                 | Invite URL generation                   | Falls back to `AUTH_URL` and then `http://localhost:3000`.                          |
| `ADMIN_EMAIL`          | Optional                    | Bootstrap admin                         | Defaults to `admin@example.com`.                                                    |
| `ADMIN_PASSWORD`       | Optional                    | Bootstrap admin                         | Enables one-time bootstrap admin sign-in until an admin user has a stored password. |
| `AUTH_TRUST_HOST`      | Deployment                  | NextAuth                                | Use when running behind a trusted proxy/container host.                             |
| `INFISICAL_TOKEN`      | Production Docker           | Docker image entrypoint                 | Used by the production Dockerfile command.                                          |

Generate a local auth secret with:

```bash
openssl rand -base64 32
```

## Database Setup

The app uses Drizzle ORM with Postgres. The schema is in `db/schema.ts`; generated migrations are under `drizzle/`.

The example env points at:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/affordable_housing_portal
```

If you use the Docker Compose database from this repo, use the host port exposed by Compose:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/affordable_housing_portal
```

Create the database with your preferred local Postgres tooling, then run:

```bash
npm run db:migrate
npm run db:seed
```

The seed script inserts:

- admin-configurable custom listing field definitions
- mock users for listing data
- mock properties, listings, and listing images

## Run The App Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If `ADMIN_PASSWORD` is set, you can sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD` to bootstrap an admin account, but only until there is already an admin user with a stored local password.

## Docker Notes

The current `docker-compose.yml` starts a local development stack with Postgres and the Next.js dev server.

Current compose behavior:

- starts a `postgres:16-alpine` database on host port `${POSTGRES_PORT:-5433}`
- builds the app from `Dockerfile.dev`
- mounts the repository into `/app`
- sets development defaults for auth, app URL, bootstrap admin, and email variables
- enables the transactional email worker by default
- runs `npm run db:migrate`, `npm run db:seed`, then `npm run dev`
- exposes the app on [http://localhost:3000](http://localhost:3000)

Commands:

```bash
npm run docker:up
npm run docker:logs
npm run docker:down
npm run docker:down:volumes
```

Use `npm run dev` when you already have a database and environment configured locally. Use `npm run docker:up` when you want the repo-provided Postgres database and app server together.

## Scripts

| Script                     | Purpose                                           |
| -------------------------- | ------------------------------------------------- |
| `npm run dev`              | Start Next.js in development mode.                |
| `npm run dev:secrets`      | Start dev through Infisical `dev` secrets.        |
| `npm run build`            | Run `next build`.                                 |
| `npm run build:secrets`    | Build through Infisical `dev` secrets.            |
| `npm run start`            | Start a built Next.js app.                        |
| `npm run start:secrets`    | Start through Infisical `dev` secrets.            |
| `npm run typecheck`        | Run TypeScript without emitting files.            |
| `npm run lint`             | Run oxlint.                                       |
| `npm run lint:fix`         | Apply oxlint fixes.                               |
| `npm run format`           | Format with oxfmt.                                |
| `npm run format:check`     | Check oxfmt formatting.                           |
| `npm test`                 | Run all Jest tests.                               |
| `npm run test:unit`        | Run tests matching `.unit.test.`.                 |
| `npm run test:integration` | Run tests matching `.integration.test.`.          |
| `npm run db:generate`      | Generate a Drizzle migration from `db/schema.ts`. |
| `npm run db:migrate`       | Apply Drizzle migrations.                         |
| `npm run db:seed`          | Seed local data using `.env.local` if present.    |
| `npm run db:studio`        | Open Drizzle Studio.                              |
| `npm run lockfile:check`   | Check package lockfile integrity.                 |

## Troubleshooting

### `DATABASE_URL is not set`

The database client and Drizzle config fail fast when `DATABASE_URL` is missing. Add it to `.env.local`, or run through Infisical with the relevant `*:secrets` script.

### Migrations do not run

Confirm that:

- `.env.local` has the database you intended
- the database exists
- the Postgres user can create/alter tables
- you are running `npm run db:migrate` from the repository root

### Invite email remains queued or fails

Creating an invite queues its email instead of waiting for provider acceptance. If its status remains `queued`, confirm that a long-lived app server has `EMAIL_WORKER_ENABLED=true`, valid `RESEND_API_KEY` and `EMAIL_FROM` values, and access to the same Postgres database. Check server logs for `[email-queue]` errors.

A `failed` status means the job permanently exhausted provider submission attempts and reached the `email_send_dead_letter` queue. Re-send the invite after correcting the provider or configuration problem. Do not rotate `AUTH_SECRET` while jobs are queued because it is used to encrypt their one-time URLs.

### Image uploads fail

Uploads are validated in `lib/images/image.service.ts`. Supported extensions are `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, and `.jxl`; processed output is stored as JPEG. Uploads must be at most 25 MB and 24 megapixels.

### Build-time database errors

The database client in `db/client.ts` uses a lazy proxy so importing server modules during build does not immediately connect to Postgres. Follow the same lazy pattern for new database clients or server SDKs.
