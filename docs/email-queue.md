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
   not cancel the in-flight send (the provider call itself is bounded by the
   15s send timeout). A deadline-exceeded attempt is handed to next/server's
   `after()`, which keeps serverless invocations alive until the late outcome
   (sent, or the retry schedule) is recorded. Should the process die anyway,
   the claimed job waits out the 10-minute lease and is reclaimed by a
   worker, with the provider idempotency key preventing a double-send.
3. **Worker drain** — A worker repeatedly claims due jobs and processes them.
   Claiming uses `SELECT ... FOR UPDATE SKIP LOCKED` plus a 10-minute
   processing lease, so any number of workers can run concurrently without
   double-claiming, and jobs from crashed workers are reclaimed. Jobs are
   claimed **one at a time**: a claim burns an attempt, so claiming a batch
   would let one hung send (or a killed worker) exhaust the attempts of jobs
   that were never processed.
4. **Retries** — Each provider call is bounded by a hard 15s timeout, and
   transient failures are retried with exponential backoff (30s doubling to a
   30min cap, ±20% jitter) up to `max_attempts` (default 7). Exhausted jobs
   are dead-lettered as `failed` with sanitized error context.
5. **Claim ownership** — Every outcome write (`sent`, `canceled`, `failed`,
   retry) must present the `claimed_at` token of the claim it belongs to. A
   stale writer — e.g. a very late inline attempt whose job was already
   reclaimed after its lease expired — becomes a no-op instead of clobbering
   the state written by the worker that now owns the job; the provider
   idempotency key keeps the email itself single-send within Resend's
   24-hour idempotency window (see below).

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

**The provider-side dedupe is time-bounded**: Resend idempotency keys expire
after 24 hours. A retry more than 24 hours after an unrecorded-but-delivered
send (e.g. a timed-out request that actually landed) would deliver again.
Crash-abandoned processing claims are therefore reclaimable only between the
10-minute lease expiry and a conservative 23-hour cutoff. Claims older than
that are dead-lettered instead of retried, preventing that crash-and-outage
path from causing duplicate delivery. Production still **requires a drain
scheduler running every few minutes** (see below): pending retries after an
ambiguous provider timeout must also complete inside the 24-hour window.

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

**Production requires a scheduler that drains every few minutes** — not just
for latency, but for correctness: retries must stay inside Resend's 24-hour
idempotency window (see above). Pick at least one:

- **GitHub Actions (shipped, works on any Vercel plan)** — the repository
  ships `.github/workflows/email-queue-drain.yml`, which calls the endpoint
  every 5 minutes. To activate it, set the repository **variable**
  `EMAIL_QUEUE_DRAIN_URL` (e.g.
  `https://<production-host>/api/cron/email-jobs`) and the repository
  **secret** `CRON_SECRET` (same value as the deployment env var). The
  workflow is skipped while the variable is unset. Note GitHub disables
  scheduled workflows after 60 days without repository activity.
- **Vercel cron** — `vercel.json` schedules the endpoint daily
  (`0 6 * * *`) as a backstop; that is the most frequent schedule Vercel
  Hobby allows and is **not sufficient on its own**. On a Pro plan, tighten
  it (e.g. `*/5 * * * *`) and the GitHub Actions workflow becomes redundant.
  Vercel sends `Authorization: Bearer $CRON_SECRET` automatically when the
  `CRON_SECRET` env var is set.
- **Self-hosted deployment** — run `node scripts/email-worker.mjs` as a
  long-lived process (systemd, container), or hit the endpoint from system
  cron.

For local development a worker is usually unnecessary: the immediate attempt
sends invites inline. To process retries, run `npm run email:worker` next to
`npm run dev` (uses `CRON_SECRET` and optional `EMAIL_WORKER_APP_URL` /
`EMAIL_WORKER_POLL_INTERVAL_MS`, default `http://localhost:3000` / 15s), or
`docker compose --profile worker up` to start the `email-worker` service
alongside the app.

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

Manually retrying a job whose last send attempt was **more than 24 hours ago**
is outside the provider's idempotency window: if an earlier attempt actually
delivered without being recorded, the retry will deliver a second copy. For
invites that is annoying rather than harmful, but check `sent_at` /
`provider_message_id` and the Resend dashboard before re-running old jobs.

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
