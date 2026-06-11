# Transactional Email Queue

All transactional email (currently account invites; password resets and saved
search alerts later) is delivered through a Postgres-backed job queue instead
of calling Resend directly from feature code.

## How it works

1. **Enqueue (outbox)** — Feature services call
   `enqueueEmailJob(...)` from `lib/email-jobs/email-job-service.ts`, passing
   their open Drizzle transaction. The job row commits atomically with the
   entity that triggered it, so a created invite can never lose its email to a
   provider outage.
2. **Immediate attempt** — Right after commit, the service makes one
   best-effort `tryProcessEmailJobNow(...)` call so the common case delivers
   within the request. Failures are swallowed (the job stays queued), but the
   outcome is returned so callers report delivery truthfully: the admin invite
   flow surfaces "sent" only when the provider accepted the email and "queued"
   otherwise, never a false success. The attempt is bounded by a ~5s deadline
   so a hanging provider cannot stall the admin request; the deadline does
   not cancel the in-flight send. If the runtime keeps the process alive a
   late success still records `sent`; on serverless runtimes that freeze
   background work the claimed job waits out the 10-minute lease and is
   reclaimed by a worker, with the provider idempotency key preventing a
   double-send.
3. **Worker drain** — A worker repeatedly claims due jobs and processes them.
   Claiming uses `SELECT ... FOR UPDATE SKIP LOCKED` plus a 10-minute
   processing lease, so any number of workers can run concurrently without
   double-claiming, and jobs from crashed workers are reclaimed.
4. **Retries** — Transient failures are retried with exponential backoff
   (30s doubling to a 30min cap, ±20% jitter) up to `max_attempts` (default 7).
   Exhausted jobs are dead-lettered as `failed` with sanitized error context.

## Job lifecycle

```
pending ──claim──▶ processing ──▶ sent       (provider accepted; terminal)
   ▲                   │
   └───retry+backoff───┼────────▶ failed     (attempts exhausted; terminal)
                       └────────▶ canceled   (obsolete, e.g. invite accepted/
                                              expired/superseded; terminal)
```

Every send passes the job's idempotency key (e.g. `account_invite/<inviteId>`)
to Resend, so a retry after a crash cannot double-send a logical email. The
same key has a unique index on `email_jobs`, so re-enqueueing is a no-op.

## Sensitive payloads

Job payloads (`payload` jsonb) hold **stable entity references only**
(`inviteId`, later `passwordResetId`, ...). Recipient name/email are loaded
fresh at send time.

Data that cannot be re-derived at processing time — the invite URL containing
the raw one-time token (only its hash is stored on `user_invites`) — is kept in
`secret_context`, encrypted with AES-256-GCM. The key comes from
`EMAIL_JOB_SECRET_KEY` (32 bytes, base64; `openssl rand -base64 32`) or, when
unset, is derived from `AUTH_SECRET` via HKDF. `secret_context` is deleted as
soon as a job reaches a terminal state; completed jobs retain only type,
recipient, provider message id, timestamps, attempts, and sanitized errors.

Rotating the encryption key makes still-pending secret contexts undecryptable;
those jobs fail with a clear error and can be re-issued (e.g. re-invite).

## Running the worker

The drain endpoint `POST|GET /api/cron/email-jobs` requires
`Authorization: Bearer $CRON_SECRET` and processes due jobs for up to ~50s per
call. It is safe to call from several schedulers at once.

- **Local dev** — usually unnecessary: the immediate attempt sends invites
  inline. To process retries, run `npm run email:worker` next to `npm run dev`
  (uses `CRON_SECRET` and optional `EMAIL_WORKER_APP_URL` /
  `EMAIL_WORKER_POLL_INTERVAL_MS`, default `http://localhost:3000` / 15s).
- **Docker** — `docker compose --profile worker up` starts the `email-worker`
  service alongside the app.
- **Vercel / serverless** — schedule the endpoint with a cron, e.g. in
  `vercel.json`:

  ```json
  { "crons": [{ "path": "/api/cron/email-jobs", "schedule": "* * * * *" }] }
  ```

  Vercel sends `Authorization: Bearer $CRON_SECRET` automatically when the
  `CRON_SECRET` env var is set.

- **Self-hosted deployment** — run `node scripts/email-worker.mjs` as a
  long-lived process (systemd, container), or hit the endpoint from system
  cron.

## Operations

Failed jobs stay visible: the drain response reports
`backlog: { pending, failed }`, and dead-lettered rows keep their sanitized
`last_error`:

```sql
select id, type, recipient_email, attempts, last_error, updated_at
from email_jobs where status = 'failed' order by updated_at desc;
```

To retry a failed job after fixing the cause:

```sql
update email_jobs
set status = 'pending', attempts = 0, run_after = now()
where id = '<job id>';
```

(For `account_invite` jobs whose secret context was already cleared, issue a
fresh invite instead — the old one-time URL is not recoverable by design.)

## Adding a new email type

1. Add the type to `email_job_type` (enum migration) and to
   `EmailJobDescriptor` in `lib/email-jobs/types.ts`, declaring which fields
   are plain payload references vs encrypted secret context.
2. Implement a handler in `lib/email-jobs/handlers.ts` that loads entities by
   reference, decides whether the send is still relevant (throw
   `EmailJobCanceledError` if not), renders content, and calls
   `sendTransactionalEmail` with the job's idempotency key.
3. Enqueue with `enqueueEmailJob(...)` inside the feature's transaction. Do not
   call Resend directly.
