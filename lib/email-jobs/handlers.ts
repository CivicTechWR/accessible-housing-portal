import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { userInvites, users, type EmailJob } from "@/db/schema";
import { renderAccountInviteEmail } from "@/lib/auth/invite-email";
import { sendTransactionalEmail } from "@/lib/email";
import { EmailJobCanceledError } from "@/lib/email-jobs/errors";
import { decryptSecretContext } from "@/lib/email-jobs/secret-context";
import type {
  AccountInviteEmailJobSecretContext,
  EmailJobHandlerRegistry,
  EmailJobHandlerResult,
} from "@/lib/email-jobs/types";

async function handleAccountInviteEmailJob(job: EmailJob): Promise<EmailJobHandlerResult> {
  const inviteId = job.payload.inviteId;

  if (!inviteId) {
    throw new EmailJobCanceledError("Job payload is missing the invite reference.");
  }

  const [row] = await db
    .select({
      invite: userInvites,
      fullName: users.fullName,
    })
    .from(userInvites)
    .innerJoin(users, eq(userInvites.userId, users.id))
    .where(eq(userInvites.id, inviteId))
    .limit(1);

  if (!row) {
    throw new EmailJobCanceledError("Invite no longer exists.");
  }

  if (row.invite.acceptedAt) {
    throw new EmailJobCanceledError("Invite was already accepted.");
  }

  if (row.invite.expiresAt <= new Date()) {
    throw new EmailJobCanceledError("Invite expired or was superseded before the email was sent.");
  }

  if (!job.secretContext) {
    throw new EmailJobCanceledError("Invite URL is no longer available for this job.");
  }

  const { inviteUrl } = decryptSecretContext<AccountInviteEmailJobSecretContext>(job.secretContext);

  const content = renderAccountInviteEmail({
    fullName: row.fullName,
    inviteUrl,
  });

  const providerMessageId = await sendTransactionalEmail({
    to: row.invite.email,
    ...content,
    idempotencyKey: job.idempotencyKey,
  });

  await db
    .update(userInvites)
    .set({ sentAt: new Date() })
    .where(and(eq(userInvites.id, inviteId), isNull(userInvites.sentAt)));

  return { providerMessageId };
}

export const emailJobHandlers: EmailJobHandlerRegistry = {
  account_invite: handleAccountInviteEmailJob,
};
