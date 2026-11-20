# Domain Model

The database schema is defined in `db/schema.ts` with Drizzle. SQL migrations and snapshots live under `drizzle/`.

## Enums

| Enum                               | Values                                                                                             | Used by                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `user_role`                        | `admin`, `partner`, `user`                                                                         | Access control and UI navigation.                      |
| `user_status`                      | `invited`, `active`, `suspended`, `deactivated`                                                    | Sign-in eligibility and account lifecycle.             |
| `listing_status`                   | `draft`, `published`, `archived`                                                                   | Listing visibility, authoring, and deletion behaviour. |
| `listing_building_type`            | `apartment`, `house`, `townhouse`, `condo`                                                         | Built-in listing building type values.                 |
| `utility_included`                 | `heat`, `water`, `electricity`, `gas`, `internet`                                                  | Built-in listing utility inclusion values.             |
| `listing_field_type`               | `boolean`, `number`, `text`, `select`, `multi_select`, `date`                                      | Admin-configured listing field definitions.            |
| `email_delivery_type`              | `account_invite`, `password_reset`, `account_welcome`                                              | Kinds of transactional email the application sends.    |
| `email_delivery_outcome`           | `queued`, `sent`, `delivered`, `delivery_delayed`, `bounced`, `complained`, `failed`, `suppressed` | Provider outcome of one email delivery attempt.        |
| `resend_webhook_processing_status` | `pending`, `processed`, `unmatched`, `failed`                                                      | State of a verified Resend webhook receipt.            |

Only users with status `active` can sign in.

## Tables

### `users`

Stores local account records.

Important fields:

- `email` has a case-insensitive unique index through `lower(email)`.
- Better Auth stores password credentials in `accounts`; `sessions`, `verifications`, `passkeys`, and `two_factors` store its other authentication data.
- `role` controls admin, partner, and normal user behaviour.
- `status` controls sign-in eligibility.
- `invite_accepted_at` and `last_login_at` support invite and audit workflows.

### `user_invites`

Tracks administrator invitations and their email submission state.

Important behaviour:

- Better Auth owns the setup token. `token_hash` identifies its invitation; `sealed_url` holds an encrypted copy for the admin copy-link action and for automatic email retries. Accepting, revoking or replacing the invitation clears it.
- New invites expire previous unaccepted invites for the same user.
- Invites expire after seven days.
- Better Auth sets the password in `accounts`. Acceptance activates the user and removes the copyable invitation URL.
- `email_queued_at` records that provider submission was requested and durably enqueued.
- the worker sets the legacy `sent_at` field when the provider first accepts the invitation email, or `email_failed_at` after permanent queue failure. An automatic retry leaves both as they are; its state is on its own delivery attempt.
- those timestamps derive the admin-facing states `not_requested`, `queued`, `submitted`, and `failed`; recipient-server delivery is not currently tracked.

pg-boss stores email jobs in its own `pgboss` schema, outside the Drizzle-managed application schema. Queue payloads reference the invite rather than duplicating recipient details. The one-time invite URL is encrypted under a key derived from `EMAIL_JOB_SECRET` while queued and redacted after a terminal outcome.

### `email_deliveries` and `email_delivery_attempts`

Application-owned records of transactional email, separate from the pg-boss job rows.

Important behaviour:

- `email_deliveries` is one logical email — `(email_type, source_entity_id)` is unique, so "the invite email for invite X" is a single row. `source_entity_id` is deliberately not a foreign key because the referenced table varies by email type.
- `email_delivery_attempts` is one provider submission of that email. An ordinary queue retry reuses its attempt row and therefore its `idempotency_key`; a new send of the same email inserts a new attempt and gets a new attempt number, idempotency key, queue job, and provider email id. For invitations that only happens through the automatic retry described below, because a manual resend creates a new invitation and so a new delivery.
- `provider_email_id` holds Resend's email id and is the correlation key for delivery outcomes.
- `outcome` uses the vocabulary Resend reports identically through webhook event names (`email.<outcome>`) and `resend.emails.get(id).last_event`, so an outcome is stored the same way however it was learned.
- Webhook reconciliation moves `outcome` past `sent`. It finds the attempt by `provider_email_id`. When no attempt holds that id yet, because the webhook arrived before the worker saved it, it uses the event's `attempt_id` and `delivery_id` tags. Both must be UUIDs and name the same attempt, and that attempt must not have a provider email id of its own. `outcome_at` is the provider's event time.
- An event is applied only when its outcome ranks above the attempt's current one, in this order: `queued`, `sent`, `delivery_delayed`, `delivered`, `failed`, `bounced`, `suppressed`, `complained`. An attempt therefore holds the highest-ranked outcome reported so far, whatever order events arrive in and however often they are replayed. The rules live in `lib/email-delivery/outcome.ts`:
  - `delivery_delayed` is not terminal, because Resend is still trying. Any terminal outcome replaces it and it replaces none.
  - `delivered` gives way to every failure. A mail server can accept a message and bounce it afterwards, and a late `delivered` must not hide a failure.
  - When two failures disagree, the one that more firmly rules out sending again wins.
  - `complained` outranks everything, so a complaint after `delivered` is stored as a complaint.
  - An event that repeats the current outcome changes nothing. The first one applied keeps its time and detail.
- `outcome_detail` is a JSON object holding the short provider codes of the event that set the outcome: `bounceType`, `bounceSubtype`, `failureReason`, and `suppressionType`, each present only when Resend sent one. `{"bounceType":"Permanent","bounceSubtype":"General"}` is a permanent bounce, and `Transient` and `Undetermined` bounces are told apart the same way. The queue worker's `skipReason` is the only other key. Read the column with `parseOutcomeDetail`. Invite URLs, reset tokens, recipient addresses, free-form provider messages, and rendered message bodies are never stored here.
- The queue worker also writes outcomes, always without an `outcome_at` and only on an attempt the provider has not accepted. A dead-lettered job leaves `failed`. An invitation job that the worker skips leaves `suppressed` with the reason in `outcome_detail`, for example `{"skipReason":"invite_accepted"}`. An administrator's skipped welcome email is `suppressed` with no detail.

#### Automatic retries of bounced invitation emails

An `account_invite` attempt that ends in a recoverable bounce gets one more attempt on the same delivery after a delay. Welcome and password-reset emails are never retried this way, and an administrator's manual resend is unchanged: it replaces the invitation and its link.

A bounce is recoverable only when `bounceType` is `Transient` and `bounceSubtype` is on the allowlist. The subtypes are the ones [Resend documents](https://resend.com/docs/dashboard/emails/email-bounces).

| `bounceType`   | `bounceSubtype`                                            | Retried | Why                                                         |
| -------------- | ---------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| `Transient`    | `General`                                                  | Yes     | A temporary problem at the recipient's mail server.         |
| `Transient`    | `MailboxFull`                                              | Yes     | The mailbox can be emptied.                                 |
| `Transient`    | `MessageTooLarge`, `ContentRejected`, `AttachmentRejected` | No      | The same message would be rejected again.                   |
| `Permanent`    | any                                                        | No      | The address does not accept mail.                           |
| `Undetermined` | any                                                        | No      | Resend could not classify the bounce.                       |
| anything else  |                                                            | No      | Only classifications named here are treated as recoverable. |

`delivery_delayed`, `suppressed`, `complained` and `failed` attempts are never retried. They stay as they are for an administrator to act on.

The attempt row is not the whole test. It keeps only its highest-ranked outcome, of two bounces it keeps the first one's detail, and a mail server can report an auto-reply to a delivered message as a transient bounce. So every stored event for the delivery's attempts must be a recoverable bounce or a `delivery_delayed`. One `delivered`, `complained`, `suppressed` or `failed` event, or one bounce off the allowlist, blocks the retry, whatever order the events arrived in.

| Bounced attempt | Retry waits | Retry is attempt |
| --------------- | ----------- | ---------------- |
| 1               | 4 hours     | 2                |
| 2               | 24 hours    | 3                |
| 3               | no retry    |                  |

The delays are `INVITE_RETRY_BACKOFF_HOURS` and the cap of three attempts is `INVITE_EMAIL_MAX_ATTEMPTS`, both in `lib/email-delivery/invite-retry-policy.ts` with the allowlist and the decision function. The cap is read from the bounced attempt's stored `attempt_number`.

The invitation must still be usable: not accepted, not revoked, not replaced, not expired, with its user still `invited`. A retry that would be sent after the invitation expires is not scheduled.

How it runs:

- The email worker's `resend_webhook_reconciliation` job schedules retries every five minutes, right after it reconciles stored events. `scheduleInviteEmailRetries` in `lib/email-delivery/invite-retry.ts` reads attempt and invitation rows, not webhook deliveries, so a retry that a crash prevented is scheduled by the next run.
- Scheduling locks the user row first, the same lock that replacing, revoking and accepting an invitation take, then decides, then inserts the new attempt and its delayed pg-boss job in that one transaction.
- The new attempt's number is the bounced attempt's plus one. The unique `(delivery_id, attempt_number)` index therefore allows one successor per bounced attempt, however many events, replays or concurrent runs ask for it.
- The retry is a new attempt with its own idempotency key, queue job and provider email id. It sends the link in the invitation's `sealed_url`, so no new token is issued and the earlier email's link keeps working. The welcome email is not sent again.
- The worker checks again right before sending, because the backoff is hours long. It skips the retry if the invitation is no longer usable or if the provider has since reported delivery, a complaint or a non-recoverable bounce for an earlier attempt. The skipped attempt becomes `suppressed` with a `skipReason` such as `already_delivered`, `bounce_not_recoverable`, `invite_expired` or `invite_accepted`.
- A retry whose job is dead-lettered becomes `failed`. Neither a `failed` nor a `suppressed` attempt is retried, and its existence stops any further retry of the attempt before it.
- The worker's "already submitted" check is per attempt (`submitted_at` on the job's own attempt), so an earlier submission does not block a retry and a queue retry of one attempt cannot send it twice.

### `resend_webhook_events`

Stores a privacy-minimized ledger of verified operational Resend events. `svix_id` is the idempotency key, so provider retries are acknowledged without creating duplicate rows. The ledger keeps the provider email id, event timestamps, correlation tags, structured bounce classification, short failure and suppression codes such as `reached_daily_quota`, and processing state. It deliberately excludes raw payloads, free-form provider diagnostics, recipient/sender addresses, subjects, message bodies, IP addresses, and links.

Only the six operational event types are stored, and they begin as `pending`. Each row needs an event type and provider email id. `event_created_at` comes from the payload's `created_at` when it parses as a date, and otherwise from the signed `svix-timestamp` header. Tags and the bounce, failure, and suppression fields are null when the payload omits them or sends an unexpected shape. The four bounce, failure, and suppression fields keep only short codes such as `Permanent`, so free-form text is stored as null. Opens, clicks, received mail, and non-email events are acknowledged without a row. A daily pg-boss maintenance job deletes every webhook row older than 90 days by the indexed receipt timestamp, whatever its `processing_status`.

Reconciliation applies each event to its delivery attempt. It runs when the event is stored, and again in a `resend_webhook_reconciliation` job that the email worker schedules every five minutes. Each event is handled in its own transaction with the event row and the attempt row locked, so the webhook request and the job cannot apply one event twice.

- `processed` rows were matched to the attempt in `delivery_attempt_id`, whether or not they changed its outcome.
- `unmatched` rows had no attempt when they were examined. The job picks one up again once an attempt holds its provider email id.
- `failed` rows hit an error. The job retries them, along with rows still `pending`.

`processed_at` is when the row was last classified.

There is no application read endpoint for the webhook ledger. Limit direct database access to authorized operators.

### `properties`

Stores building/property-level data for listings.

Important fields:

- `owner_user_id` links a property to a partner/admin account.
- address, neighbourhood, latitude, and longitude drive listing display and map behaviour.
- contact fields feed listing details and application contact data.
- `created_by_user_id` and `updated_by_user_id` retain audit context.

### `listings`

Stores the primary listing row.

Important fields:

- `property_id` links to `properties`.
- `status` controls visibility.
- common searchable fields such as bedrooms, bathrooms, rent, availability, and square footage are normalized columns.
- `unit_number`, `building_type`, `lease_term_months`, `utilities_included`, `heating_type`, `deposit_info`, and `application_url` are built-in listing columns.
- `monthly_rent_cents` and `max_income_cents` store money as integer cents.
- `custom_fields` stores dynamic feature state in JSONB.
- `published_at` and `archived_at` capture status transitions.

The `custom_fields` column has a GIN index because listing filters can query dynamic boolean field keys.

### `listing_images`

Stores uploaded listing images and external image references.

Important behaviour:

- Uploaded files are processed to JPEG and stored in `image_data`.
- Seeded or external images can use `image_url`.
- Every image belongs to a listing. Uploads require an existing listing, so the form creates a draft first.
- `sort_order` controls display order.

### `saved_listings`

Stores many-to-many saved listing records between users and listings. Current code defines the table but the main saved-listing product flow is not yet a primary user-facing area.

### `saved_searches`

Stores named search filters as JSONB per user. Current code defines the table for future saved-search behaviour.

### `listing_field_definitions`

Stores admin-configured custom listing field definitions.

Important fields:

- `key` is unique and becomes the stable field identifier in listing `custom_fields`.
- `label`, `description`, `help_text`, and `placeholder` drive UI display.
- `field_type` describes expected value shape.
- `category` groups fields for display and reordering.
- `applies_to` is required and records whether the value is shared across units in a `building`
  or specific to one `unit`; it is independent of `category`.
- `is_public` controls whether the field is visible outside admin surfaces.
- `is_filterable` controls whether it can be used as a public filter.
- `is_required` is available for validation/UI policy.
- `sort_order` orders fields inside a category.
- `options` stores selectable values for select-style fields.

Admin services normalize categories to uppercase when creating or updating definitions.

## Relationships

```text
users
  -> user_invites.created_by_user_id
  -> properties.owner_user_id
  -> properties.created_by_user_id / updated_by_user_id
  -> listings.created_by_user_id / updated_by_user_id
  -> listing_images.uploaded_by_user_id
  -> saved_listings.user_id
  -> saved_searches.user_id
  -> listing_field_definitions.created_by_user_id / updated_by_user_id

properties
  -> listings.property_id

listings
  -> listing_images.listing_id
  -> saved_listings.listing_id
```

Deletion behaviour:

- Deleting a user cascades invites, listing image upload ownership, saved listings, and saved searches where configured.
- Properties and listings use restrictive ownership references because listing records should not silently disappear when an owner changes.
- Deleting a listing cascades listing images and saved listing rows.
- "Deleting" a listing through product behaviour archives it rather than removing the row.

## `custom_fields` JSON

Listing authoring stores selected admin-configured accessibility features in `listings.custom_fields`. Current authoring writes boolean keys that match `listing_field_definitions.key`; a selected feature is stored as `custom_fields[definition.key] = true`.

Built-in values such as units, rent, bedrooms, bathrooms, building type, lease term, utilities, application URL, and contact data are stored in normalized listing/property columns. Use normalized columns when a field must be frequently filtered, sorted, joined, or constrained. Use `custom_fields` for project-configurable feature metadata that can vary by listing field definitions.

`listings.heating_type` is a nullable enum. `null` means unanswered; `unknown` means the lister selected "Not sure". Existing listings have no assumed heating type. The allowed values and display labels live in `shared/heating-type.ts`.

## Money And Dates

- Rent and income values are persisted as cents.
- Form/API values often use dollar amounts and are converted in `lib/listings/store.ts` or `lib/listings/listing.service.ts`.
- Listing availability uses a Postgres `date` column and ISO date strings at schema boundaries.
- User/account timestamps use timezone-aware Postgres timestamps.

## Migrations

When changing persistence:

1. Update `db/schema.ts`.
2. Generate a migration with `npm run db:generate`.
3. Review the generated SQL under `drizzle/`.
4. Apply it locally with `npm run db:migrate`.
5. Update seed data if the change affects local setup.
6. Update this document when tables, enums, relationships, or conventions change.

Do not hand-edit Drizzle snapshot files unless you are repairing a migration state issue and understand the impact.

## Seeds

`db/seed.ts` is idempotent for the current seed records. It upserts custom listing field definitions, mock users, properties, listings, and listing image references.

Seed data comes from:

- `db/seeds/custom-listing-fields.ts`
- `db/seeds/mock-listings.ts`
