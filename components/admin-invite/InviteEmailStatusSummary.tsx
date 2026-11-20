import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  HourglassIcon,
  MailRemove01Icon,
  MailSend01Icon,
  RepeatIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

import { INVITE_EMAIL_MAX_ATTEMPTS } from "@/lib/email-delivery/invite-retry-policy";
import { cn } from "@/lib/utils";
import type { InviteEmailStatus } from "@/shared/schemas/account-management";

type State = InviteEmailStatus["state"];
type FailureReason = Extract<InviteEmailStatus, { state: "failed" }>["reason"];

const labels: Record<State, string> = {
  not_requested: "No email requested",
  queued: "Email queued",
  submitted: "Email sent",
  delayed: "Email delayed",
  delivered: "Email delivered",
  retrying: "Email bounced, retrying",
  failed: "Email not delivered",
  complained: "Email marked as spam",
};

// Decorative. The label carries the meaning, so a status never depends on its icon or colour.
const icons: Record<State, IconSvgElement> = {
  not_requested: MailRemove01Icon,
  queued: Clock01Icon,
  submitted: MailSend01Icon,
  delayed: HourglassIcon,
  delivered: CheckmarkCircle02Icon,
  retrying: RepeatIcon,
  failed: Alert02Icon,
  complained: Alert02Icon,
};

const failureExplanations: Record<FailureReason, string> = {
  permanent_bounce:
    "The address does not accept mail. Check it for typos, then send a new invite or invite the correct address.",
  bounced:
    "The email bounced and will not be sent again automatically. Check the address, then send a new invite.",
  retries_used_up: `The email bounced ${INVITE_EMAIL_MAX_ATTEMPTS} times and will not be sent again automatically. Check the address, then send a new invite.`,
  address_suppressed:
    "The email provider blocks this address because an earlier email to it bounced or was reported as spam. Contact the person another way.",
  provider_failed:
    "The email provider could not send the email. Send a new invite. If that fails too, tell the site maintainers.",
  send_failed:
    "The portal could not send the email. Send a new invite. If that fails too, tell the site maintainers.",
};

function explain(status: InviteEmailStatus): string {
  switch (status.state) {
    case "not_requested":
      return "Copy the invitation link and share it yourself.";
    case "queued":
      return "The email is waiting to be sent.";
    case "submitted":
      return status.attemptNumber > 1
        ? `Sent again after a bounce, attempt ${status.attemptNumber} of ${INVITE_EMAIL_MAX_ATTEMPTS}. Waiting for the recipient's mail server to confirm delivery.`
        : "Waiting for the recipient's mail server to confirm delivery.";
    case "delayed":
      return "The recipient's mail server has not accepted the email yet. The email provider is still trying.";
    case "delivered":
      return status.bounceReported
        ? "The recipient's mail server accepted the email. It also reported a bounce, which is usually an automatic reply, so the email is not sent again."
        : "The recipient's mail server accepted the email.";
    case "retrying":
      return `The mailbox was full or the mail server had a temporary problem. Attempt ${status.attemptNumber} of ${INVITE_EMAIL_MAX_ATTEMPTS} is sent automatically within about a day.`;
    case "failed":
      return failureExplanations[status.reason];
    case "complained":
      return "The recipient reported the email as spam, so the email provider blocks more email to this address. Contact the person another way.";
  }
}

/** One invitation's email status as a label and a sentence on what it means or what to do. */
export function InviteEmailStatusSummary({
  status,
  className,
}: {
  status: InviteEmailStatus;
  className?: string;
}) {
  const needsAction = status.state === "failed" || status.state === "complained";

  return (
    <div className={cn("space-y-1", className)}>
      <p
        className={cn(
          "flex items-start gap-1.5 text-sm font-medium",
          needsAction ? "text-destructive" : "text-foreground",
        )}
      >
        <HugeiconsIcon
          icon={icons[status.state]}
          strokeWidth={2}
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0"
        />
        {labels[status.state]}
      </p>
      <p className={cn("text-xs", needsAction ? "text-foreground" : "text-muted-foreground")}>
        {explain(status)}
      </p>
    </div>
  );
}
