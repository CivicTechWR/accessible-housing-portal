# Authentication and account management

HomeHub uses Better Auth 1.7 with its Drizzle adapter, database sessions, passkey plugin, and two-factor plugin. Password hashing, reset-token consumption, WebAuthn challenges, authenticator codes, recovery codes, cookies, and session expiry belong to Better Auth. No hosted authentication service is required.

The configuration is in `lib/auth.ts`, the React client in `lib/auth-client.ts`, and the Next.js 16 route handler in `app/api/auth/[...all]/route.ts`. `nextCookies()` supports cookie changes from server actions. The proxy only redirects requests that have no session cookie. Services check the database session and current account permissions before accessing protected data.

## Access rules

| Role                      | Access                                                          |
| ------------------------- | --------------------------------------------------------------- |
| Admin                     | Manage users and custom listing fields; manage all listings.    |
| Housing Lister, `partner` | Create and manage their own listings and view their own drafts. |
| Housing Searcher, `user`  | Browse published listings.                                      |

Only `active` accounts can sign in or use protected features. `invited`, `suspended`, and `deactivated` accounts cannot. Status changes revoke stored sessions, and services read current roles and status instead of trusting a cached cookie. Listing ownership checks remain in `lib/policies/listing-policy.ts`. Users cannot edit their own application role or status through Better Auth's profile API.

## Invitations

Registration is invite-only. Better Auth's public email sign-up is disabled. Administrators create accounts through `/admin/invite` and manage them in `/admin/users`.

An invitation creates an `invited` user and asks Better Auth for a password-setup token. A server-only request context distinguishes administrator invitations from ordinary reset requests. The email callback records the invitation and its queue job in one database transaction. The invitation stores a lookup fingerprint of the Better Auth token and an encrypted URL for the admin copy-link action.

Invitation links expire after seven days. A verification hook sets this expiry on Better Auth's token; ordinary reset links expire after one hour. Sending a new invitation expires previous links. Admins can copy a valid link, send a replacement, or revoke it. The users page shows pending, accepted, expired, and revoked invitations alongside email submission states: `not_requested`, `queued`, `submitted`, and `failed`. `submitted` means Resend accepted the message, not that the recipient received it.

Accepting a valid invitation sets the password through Better Auth, marks the email verified, and activates the account. The reset route runs Better Auth on a transaction scoped adapter while holding the user row lock, so password setup and invitation replacement cannot overtake each other. The user then signs in normally. Public reset requests do not deliver setup links to invited or restricted accounts. Resetting a password cannot reactivate a suspended or deactivated account. Existing activated accounts receive password-reset emails rather than new invitations.

## Account security

`/manage-account` lets users:

- Change their password and sign out other sessions.
- Add or remove passkeys.
- Enable an authenticator app by scanning a QR code and verifying a TOTP code.
- Save or replace single-use recovery codes and disable authenticator verification with their password.
- Inspect and revoke their sessions.

Password sign-in requires a second factor when enabled. A passkey uses the device's verification and does not prompt for an additional authenticator code. Enrollment requires an authenticated session. No SMS, paid dashboard, or managed Better Auth service is configured.

Passwords must contain 12 to 128 characters. Password resets revoke sessions but do not remove the user's authenticator or passkeys. Reset links and other verification identifiers use Better Auth's hashed storage. Rate limiting uses PostgreSQL so it is shared across application instances.

## Administrator setup

Create the first administrator explicitly after applying migrations:

```bash
npm run auth:admin
```

Supply `DATABASE_URL`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD` through the environment or `.env.local`. The command uses Better Auth's password hashing and creates a credential account. It refuses to overwrite an existing account. Remove the bootstrap password afterward. Normal sign-in never creates or promotes users.

Administrators use the in-app directory to edit name, organization, role, and status, send password resets, and revoke sessions. An administrator cannot remove their own admin access. There is no separate authentication dashboard to administer.

## Email delivery

Better Auth calls `lib/auth/email.ts`, which enqueues typed jobs using the existing `EmailDeliveryAttemptRef` contract. `lib/email-queue/worker.ts` sends them through `lib/email.ts` and Resend. Existing idempotency, retry, quota-deferral, dead-letter, and delivery-attempt records remain in use. Invite and reset links are encrypted with the separate `EMAIL_JOB_SECRET` while queued and redacted from settled jobs.

Keep `EMAIL_JOB_SECRET` stable while queued jobs or valid copyable invitations exist. `BETTER_AUTH_SECRET` protects authentication cookies and encrypted authenticator data; changing it invalidates or makes that data unreadable. Production and staging need separate secrets and databases.

Future watched-listing notifications can add a typed email job and a renderer to the same queue. They should use a lower priority than invitations and password resets and keep recipient lookup and delivery tracking in the shared infrastructure.

For local review, `EMAIL_TRANSPORT=capture` writes emails into `EMAIL_CAPTURE_DIR`. It never calls Resend and is rejected in production. Start the local inbox with `node --env-file=.env.local scripts/email-inbox.mjs`. The inbox binds only to loopback.

## Documentation

- [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next)
- [Email and password](https://better-auth.com/docs/authentication/email-password)
- [Passkeys](https://better-auth.com/docs/plugins/passkey)
- [Two-factor authentication](https://better-auth.com/docs/plugins/2fa)
- [Deployment configuration](deployment.md)
