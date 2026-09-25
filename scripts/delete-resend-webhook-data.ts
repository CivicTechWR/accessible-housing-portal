import postgres from "postgres";
import { z } from "zod";

function getUserId() {
  const args = process.argv.slice(2);

  if (args.length !== 2 || args[0] !== "--user-id") {
    throw new Error("Pass exactly one valid user UUID with --user-id <uuid>.");
  }

  return z.uuid("Pass exactly one valid user UUID with --user-id <uuid>.").parse(args[1]);
}

async function main() {
  const databaseUrl = z.url("DATABASE_URL must be a valid URL.").parse(process.env.DATABASE_URL);
  const userId = getUserId();
  const client = postgres(databaseUrl, { max: 1 });

  try {
    const deleted = await client<{ svix_id: string }[]>`
      DELETE FROM resend_webhook_events AS event
        USING email_delivery_attempts AS attempt, email_deliveries AS delivery
        WHERE attempt.delivery_id = delivery.id
          AND (
            event.delivery_attempt_id = attempt.id
            OR event.attempt_id_tag = attempt.id::text
            OR event.provider_email_id = attempt.provider_email_id
          )
          AND (
            (delivery.email_type = 'password_reset' AND delivery.source_entity_id = ${userId}::uuid)
            OR (
              delivery.email_type = 'account_invite'
              AND delivery.source_entity_id IN (
                SELECT invite.id FROM user_invites AS invite WHERE invite.user_id = ${userId}::uuid
              )
            )
          )
        RETURNING event.svix_id
    `;

    console.log(`Deleted ${deleted.length} Resend webhook event(s) for user ${userId}.`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unable to delete webhook data.");
  process.exitCode = 1;
});
