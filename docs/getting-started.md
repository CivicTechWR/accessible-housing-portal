# Getting Started

This guide covers local setup, environment variables, database setup, scripts, and common troubleshooting.

## Prerequisites

- Node.js `22.6.0` or newer. The project currently builds its production image from `node:22.14.0-slim`.
- npm. Use the committed `package-lock.json` with `npm ci`.
- Postgres. Local development expects a reachable database through `DATABASE_URL`.
- Optional: Infisical for deployed/prod-like secrets.
- Optional: Resend credentials if you want invite emails to actually send.

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

| Variable              | Required                        | Used by                                 | Notes                                                                               |
| --------------------- | ------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------- |
| `DATABASE_URL`        | Yes                             | Drizzle, app services, migrations, seed | Must point at Postgres. `drizzle.config.ts` loads `.env.local` and then `.env`.     |
| `AUTH_SECRET`         | Yes                             | NextAuth                                | Use a random secret for local development.                                          |
| `RESEND_API_KEY`      | Only when sending invite emails | `lib/email.ts`                          | Required when an admin creates an invite with `sendInviteEmail: true`.              |
| `EMAIL_FROM`          | Only when sending invite emails | `lib/email.ts`                          | Sender address for Resend.                                                          |
| `NEXT_PUBLIC_APP_URL` | Recommended                     | Invite URL generation                   | Falls back to `AUTH_URL` and then `http://localhost:3000`.                          |
| `ADMIN_EMAIL`         | Optional                        | Bootstrap admin                         | Defaults to `admin@example.com`.                                                    |
| `ADMIN_PASSWORD`      | Optional                        | Bootstrap admin                         | Enables one-time bootstrap admin sign-in until an admin user has a stored password. |
| `AUTH_TRUST_HOST`     | Deployment/Docker               | NextAuth                                | The current Docker Compose file sets this to `true`.                                |
| `INFISICAL_TOKEN`     | Deployment/Docker               | Docker image entrypoint                 | Used by the production Dockerfile command.                                          |

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

The current `docker-compose.yml` runs only the app container. It does not start a local Postgres service, run migrations, or seed data.

Current compose behavior:

- builds the production `Dockerfile`
- runs the app through `infisical run --env=prod`
- exposes `127.0.0.1:${PORT:-3100}:${PORT:-3100}`
- expects `INFISICAL_TOKEN` and production-like secrets

Commands:

```bash
npm run docker:up
npm run docker:logs
npm run docker:down
npm run docker:down:volumes
```

For local app development, `npm run dev` plus a local Postgres database is usually the right workflow.

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

### Invite email fails

Invite creation can return an invite URL without sending email. Actual email delivery requires `RESEND_API_KEY` and `EMAIL_FROM`.

### Image uploads fail

Uploads are validated in `lib/images/image.service.ts`. Supported extensions are `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, and `.jxl`; processed output is stored as JPEG. Uploads must be at most 25 MB and 24 megapixels.

### Build-time database errors

The database client in `db/client.ts` uses a lazy proxy so importing server modules during build does not immediately connect to Postgres. Follow the same lazy pattern for new database clients or server SDKs.
