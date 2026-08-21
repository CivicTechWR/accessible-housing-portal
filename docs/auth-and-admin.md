# Auth And Admin

This guide covers sign-in, sessions, invites, roles, protected routes, account management, and admin custom listing fields.

## Main Files

| Area                  | Files                                                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| NextAuth setup        | `auth.ts`, `app/api/auth/[...nextauth]/route.ts`                                                                           |
| Proxy                 | `proxy.ts`, `lib/auth/route-policy.ts`                                                                                     |
| Session helpers       | `lib/auth/session.ts`                                                                                                      |
| Credentials and users | `lib/auth/user-store.ts`, `lib/auth/password.ts`, `lib/auth/validation.ts`                                                 |
| Invites               | `lib/auth/invite-service.ts`, `lib/auth/invite-store.ts`, `app/invite/actions.ts`                                          |
| Password reset        | `lib/auth/password-reset-service.ts`, `lib/auth/password-reset-email.ts`, `app/forgot-password/*`, `app/reset-password/*`  |
| Account management    | `app/manage-account/*` (password change for signed-in users)                                                               |
| Account admin         | `lib/accounts/*`, `app/api/admin/accounts/*`, `app/(admin)/admin/users/page.tsx`                                           |
| Email queue           | `instrumentation.ts`, `lib/email-queue/*`, `lib/email.ts`, `lib/auth/invite-email.ts`                                      |
| Custom field admin    | `lib/custom-listing-fields/*`, `app/api/admin/custom-listing-fields/*`, `app/(admin)/admin/custom-listing-fields/page.tsx` |
| Policies              | `lib/policies/account-policy.ts`, `lib/policies/listing-policy.ts`                                                         |

## Roles

| Role      | Current capabilities                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------- |
| `admin`   | Manage users, manage custom listing fields, create/edit/archive listings, view all draft/archived listings. |
| `partner` | Create/edit/archive own listings, use "My Listings", view own drafts/archives.                              |
| `user`    | View signed-in listing search and published listing details. Cannot write listings or access admin areas.   |

## User Statuses

| Status        | Meaning                                                          |
| ------------- | ---------------------------------------------------------------- |
| `invited`     | Account exists but invite has not been accepted. Cannot sign in. |
| `active`      | Account can sign in.                                             |
| `suspended`   | Account cannot sign in.                                          |
| `deactivated` | Account cannot sign in.                                          |

`isUserAllowedToSignIn` currently allows only `active`.

## Sign-In Flow

Credentials sign-in is configured in `auth.ts`.

```text
sign-in form
  -> signInWithPassword server action
  -> NextAuth credentials provider
  -> getUserForAuth(email)
  -> optional ensureBootstrapAdmin(email, password)
  -> verifyPassword
  -> recordSuccessfulLogin
  -> JWT session with role/status
```

The session callback adds `id`, `role`, and `status` to `session.user`. Type augmentation is in `types/next-auth.d.ts`.

## Bootstrap Admin

If `ADMIN_PASSWORD` is set, the credentials provider can create or update a bootstrap admin account when signing in with:

- `ADMIN_EMAIL`, defaulting to `admin@example.com`
- `ADMIN_PASSWORD`

This works only while no admin user already has a stored password hash. It is intended for first-run setup and local/development recovery.

## Invites

Admins create invites through `createAccountService`, which delegates to `createInvite`.

Invite behavior:

- email is normalized to lowercase
- existing user records are reused by email
- new user records start with status `invited`
- invite tokens are opaque and stored only as hashes
- unaccepted active invites for the same user are expired when a new invite is created
- invite URLs are generated from `NEXT_PUBLIC_APP_URL`, then `AUTH_URL`, then `http://localhost:3000`
- when email is requested, the invite and its pg-boss job are written in the same transaction
- successful invite creation means the email is queued, not submitted
- the worker requires `EMAIL_WORKER_ENABLED=true`, `RESEND_API_KEY`, and `EMAIL_FROM`
- admin lists derive `queued`, `submitted`, `failed`, or `not_requested` from persisted queue timestamps; `submitted` means provider acceptance, not confirmed recipient-server delivery

Invite acceptance:

```text
/invite?token=...
  -> acceptInviteAction
  -> validate token and password
  -> getPendingInviteByToken
  -> hashPassword
  -> acceptInvite transaction
  -> sign in with credentials
  -> redirect("/")
```

Password rules:

- 8 to 72 characters
- at least one letter
- at least one number
- confirmation must match

## Forgot / Reset Password Flow

Password reset uses opaque single-use tokens stored only as hashes in the
`password_reset_tokens` table, modeled on invites:

- request (`/forgot-password`) → `requestPasswordResetAction`
- consumption (`/reset-password?token=...`) → `resetPasswordWithTokenAction`
- TTL is 30 minutes; each row stores `token_hash`, `expires_at`, `used_at`, and the email lifecycle trio `email_queued_at` / `sent_at` / `email_failed_at`
- creating a request expires all outstanding unused tokens for the user, so old links die immediately on re-request
- the reset email is enqueued through the pg-boss queue with the reset URL sealed like invite URLs; the recipient is derived from the token row at send time
- requests are throttled per user (`PASSWORD_RESET_MAX_PER_HOUR`)

Request behavior is deliberately neutral: unknown emails, accounts without a
password hash, non-active statuses, throttled users, and enqueue failures all
return the same success message, so the form cannot reveal whether an account
exists.

Reset behavior:

- the token row is claimed by a conditional `UPDATE ... WHERE used_at IS NULL AND expires_at > now()`, making consumption atomic and single-use
- the new password hash is written in the same transaction as the claim
- invalid, expired, used, and superseded tokens all return one generic error
- user status is never touched: a suspended or deactivated account is not reactivated by a reset (and its reset link can be requested but the account still cannot sign in)

Known follow-ups (out of scope here):

- existing JWT sessions are not invalidated by a password change/reset (would need a `passwordChangedAt` check in the `jwt` callback)
- repo-wide rate limiting beyond the per-user reset throttle

## Manage Account (Signed-In Password Change)

`/manage-account` lets an active signed-in user change their password:
current password verification → new password validation →
`updateUserPasswordHash`. Validation failures are reported per field
(`fieldErrors`) beside each input with `aria-invalid` + `aria-describedby`; the
forgot/reset forms use the same pattern. `AcceptInviteForm` still uses banner-only errors and should adopt the same field-level pattern later.

## Protected Routes

`proxy.ts` exports NextAuth's `auth` as the Next.js proxy. `lib/auth/route-policy.ts` decides which requests require an auth session:

- pages under `/admin`
- pages under `/listings`
- pages under `/listing-form`
- pages under `/my-listings`
- APIs under `/api/admin`
- all APIs under `/api/listings`

This is a broad gate, not the complete authorization model. Route layouts, server actions, API handlers, and services still enforce role-specific behavior.

Route-group layouts add user-facing protection:

- `app/(admin)/admin/layout.tsx` requires an active admin.
- `app/(listing-author)/layout.tsx` requires an active admin or partner.

API/session helpers:

- `getOptionalSession` returns a valid active session/user pair when available.
- `requireSession` returns a `401` response when no active session exists.
- `requireAdminSession` returns `403` for non-admins.
- `requireListingWriteSession` returns `403` for non-admin/non-partner users.

## Account Admin

Admins manage accounts through `/admin/users` and `/api/admin/accounts`.

Current behavior:

- list accounts with role, status, and search filters
- invite an account
- inspect one account
- update name, role, status, and organization
- deactivate an account
- list recent unaccepted, unexpired invites, including queued, submitted, failed, and manually shared invites

Safety rules in `account-policy.ts`:

- only admins can manage accounts
- admins cannot remove their own admin access
- users cannot deactivate their own account through the admin API

## Custom Listing Field Admin

Admins manage dynamic listing fields through `/admin/custom-listing-fields` and `/api/admin/custom-listing-fields`.

Field definition behavior:

- `key` is unique and should be treated as stable once listings use it.
- `category` is normalized to uppercase in admin services.
- `appliesTo` is required, accepts `building` or `unit`, and remains independent of category.
  Changes affect future listing duplications rather than copies that already exist.
- `publicOnly` maps to `is_public`.
- `filterableOnly` maps to `is_filterable`.
- `required` maps to `is_required`.
- `options` stores select/multi-select choices.
- reorder requires every field in a category exactly once with contiguous sort order.

Listing filters currently use public, filterable, boolean field definitions.

## Email

Email is intentionally isolated and asynchronous:

- `createInvite` writes the invite and enqueues an `email_send` pg-boss job in one transaction.
- `instrumentation.ts` starts the worker only in the Node.js runtime when `EMAIL_WORKER_ENABLED=true`.
- `lib/email-queue/worker.ts` is the only provider-submission path and calls the shared service in `lib/email.ts`.
- transient provider failures retry with bounded exponential backoff; rate limits and daily quota exhaustion can defer submission.
- permanently failing jobs move to `email_send_dead_letter`, and the worker records `email_failed_at` for the invite or password reset token.
- provider acceptance records the legacy `sent_at` field; no requested email leaves `email_queued_at` unset and produces `not_requested`.

Job payloads identify the invite without storing recipient details in the queue. The one-time invite URL is sealed with AES-256-GCM under a key derived from `AUTH_SECRET` and redacted after a terminal outcome. Rotating `AUTH_SECRET` while jobs are queued makes their sealed URLs unreadable and causes those jobs to fail.

Do not create Resend clients in UI or route handlers or add another provider-submission path around the queue. New email types must extend the job contract and both the send and dead-letter handlers.

## Adding Protected Behavior

When adding a protected feature:

1. Decide which roles can access it.
2. Add or reuse a policy function in `lib/policies`.
3. Gate route UI with a layout or page-level server check when needed.
4. Gate API/services with session helpers and policy checks.
5. Return `401` for no session, `403` for wrong role, and `404` when hiding private resource existence is intentional.
6. Add tests for the policy or route-policy behavior when the rule is non-trivial.
