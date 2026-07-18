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
- permanently failing jobs move to `email_send_dead_letter`, and the worker records `email_failed_at` for the invite.
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
