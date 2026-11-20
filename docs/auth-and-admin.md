# Authentication and account management

Home Hub uses Better Auth 1.7 with its Drizzle adapter, database sessions, passkey plugin, and two-factor plugin. Password hashing, reset-token consumption, WebAuthn challenges, authenticator codes, recovery codes, cookies, and session expiry belong to Better Auth. No hosted authentication service is required.

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

When email sending is selected, housing searchers and listers receive a welcome message before the account invitation. The welcome uses navigator or provider copy based on the current role. Admin invitations contain only the account invitation, and creating a copyable link without email sending queues neither message.

Welcome delivery uses `account_welcome` records keyed to the user. Invitation resends reuse the pending or submitted welcome attempt, so retries and replacement invitations do not send the welcome again after submission. Each attempt stores its first rendered message encrypted, keeping the provider payload stable when a name or role changes before recovery. A permanently failed welcome gets a new attempt when the invitation is resent. Only the invitation currently owning the welcome attempt can mark it failed. The queue submits the welcome before the invitation, then checks invitation validity and account status again. A welcome failure delays the invitation until retry succeeds. Older jobs without a welcome attempt continue to send only their invitation.

Invitation links expire after seven days. A verification hook sets this expiry on Better Auth's token; ordinary reset links expire after one hour. Sending a new invitation expires previous links. Admins can copy a valid link, send a replacement, or revoke it. The users page shows pending, accepted, expired, and revoked invitations.

### Invitation email status

For every invitation that can still be used, the users page and the recent invites list on `/admin/invite` show what happened to its email, with a sentence on what that means or what to do. Statuses that need an administrator are shown in the alert colour with a warning icon.

| Status shown            | When                                                                                                                                                               | What the administrator does                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| No email requested      | The invitation was created as a link only.                                                                                                                         | Copy the link and share it.                                       |
| Email queued            | The email worker has not sent the first attempt yet.                                                                                                               | Nothing.                                                          |
| Email sent              | Resend accepted the latest attempt and has reported nothing since. This is not confirmed delivery.                                                                 | Nothing.                                                          |
| Email delayed           | Resend reported a delay and is still trying.                                                                                                                       | Nothing.                                                          |
| Email delivered         | The recipient's mail server accepted the email.                                                                                                                    | Nothing.                                                          |
| Email bounced, retrying | The email bounced for a reason that can clear, and an automatic retry is waiting or will be scheduled by the next worker sweep.                                    | Nothing.                                                          |
| Email not delivered     | A permanent bounce, a bounce that is not retried, three bounced attempts, an address Resend suppresses, a failure at Resend, or a send job that was dead-lettered. | Check the address, then send a new invite or contact the person.  |
| Email marked as spam    | The recipient reported the email as spam.                                                                                                                          | Contact the person another way. Resend blocks more email to them. |

Accepted, revoked, replaced and expired invitations, and invitations whose account is no longer `invited`, show only their invitation status. Their email needs no action, so it is not reported.

`getInviteEmailStatus` in `lib/email-delivery/invite-email-status.ts` derives the status from the delivery's attempts and the provider events reconciled to them, and `components/admin-invite/InviteEmailStatusSummary.tsx` holds the wording. `findAccountInvites` and `findRecentAccountInvites` in `lib/auth/invite-store.ts` load the attempts and events for all listed invitations in one query. The rules:

- The delivery is read as a whole, not from its latest attempt. An attempt keeps only its highest-ranked outcome, and `bounced` outranks `delivered`.
- A `delivered` event next to a bounce that is not permanent shows as delivered, with a note that a bounce was also reported. That bounce is usually an automatic reply, and the retry rules send nothing more for the same reason. A permanent bounce shows as not delivered even after a `delivered` event, because a mail server can accept a message and reject it afterwards.
- Whether a bounce is retried is decided by `decideInviteRetry` and `getProviderRetryBlocker`, the functions the worker uses, so the page and the worker agree.
- A retry that the worker chose not to send is `suppressed` with a `skipReason`. It is not a report about the address, so the attempts before it decide the status.
- `failed` and `suppressed` written by the worker have no `outcome_at`. A `failed` attempt without one is a dead-lettered send job, including a dead-lettered automatic retry, which `user_invites.email_failed_at` does not record.
- Only short provider codes are read. The page never shows `outcome_detail`, provider email ids or provider text.

Welcome and password-reset emails are not reported on these pages.

If Resend later reports that an invitation email bounced for a reason that can clear, a full mailbox or a temporary mail-server problem, the email worker sends the same link again by itself: once after 4 hours and once more after 24, and only while the invitation is still pending and unexpired. It issues no new token, so the link in the earlier email still works, and it does not repeat the welcome message. Every other failure waits for an administrator. Sending a replacement from the users page works as before and cancels any retry still waiting, because the replaced invitation has expired. `docs/domain-model.md` lists the bounce types that are retried.

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

The forgot-password form submits to `POST /api/auth/request-password-reset`. Better Auth allows three requests per IP, across all email addresses, before rejecting further requests with HTTP 429 and the account-independent message "Too many requests. Please try again later." The database counter updates atomically before account lookup, reset-token creation, or email enqueueing. The budget resets 60 seconds after the last allowed request. Rejected requests do not extend that recovery period, and `X-Retry-After` reports the remaining seconds. Allowed requests return the same neutral response for known and unknown accounts.

The limiter reads only the trusted proxy's `X-Real-IP` header. IPv6 addresses share a `/64` budget. Missing or invalid client IPs share one fallback budget instead of bypassing the limit. See [deployment requirements](deployment.md#railway-configuration) before adding a proxy or exposing the application origin.

Reset emails also have a per-account limit of three queued emails in the preceding hour. Requests above that limit receive the same neutral response without queuing another email. Password changes and resets do not clear this email budget. Administrator invitations use a separate delivery path. Server-side administrator resets bypass the public per-IP limiter.

Administrator password resets share this limit. The admin action reports when the account is throttled or the email could not be queued, and confirms success only after enqueueing commits.

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
