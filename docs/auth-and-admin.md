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
| Custom field admin    | `lib/custom-listing-fields/*`, `app/api/admin/custom-listing-fields/*`, `app/(admin)/admin/custom-listing-fields/page.tsx` |
| Policies              | `lib/policies/account-policy.ts`, `lib/policies/listing-policy.ts`                                                         |

## Roles

| Role      | Current capabilities                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------- |
| `admin`   | Manage users, manage custom listing fields, create/edit/archive listings, view all draft/archived listings. |
| `partner` | Create/edit/archive own listings, use "My Listings", view own drafts/archives.                              |
| `user`    | Reserved for future user-facing account features. Cannot write listings or access admin areas.              |

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
- actual email sending requires `RESEND_API_KEY` and `EMAIL_FROM`

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
- pages under `/listing-form`
- pages under `/my-listings`
- APIs under `/api/admin`
- non-GET requests under `/api/listings`

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
- list recently sent pending invites

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

Public search filters currently use public, filterable, boolean field definitions.

## Email

Email is intentionally isolated:

- `lib/email.ts` creates the Resend client and validates `EMAIL_FROM`.
- `lib/auth/invite-email.ts` builds and sends invite emails.

Do not create Resend clients in UI or route handlers. Keep email behavior inside server-only modules.

## Adding Protected Behavior

When adding a protected feature:

1. Decide which roles can access it.
2. Add or reuse a policy function in `lib/policies`.
3. Gate route UI with a layout or page-level server check when needed.
4. Gate API/services with session helpers and policy checks.
5. Return `401` for no session, `403` for wrong role, and `404` when hiding private resource existence is intentional.
6. Add tests for the policy or route-policy behavior when the rule is non-trivial.
