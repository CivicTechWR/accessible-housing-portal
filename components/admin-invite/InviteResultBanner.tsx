import type { InviteActionResult } from "@/components/admin-invite/types";
import { AlertBanner } from "@/components/ui/alert-banner";

type InviteResultBannerProps = {
  result: InviteActionResult | null;
};

export function InviteResultBanner({ result }: InviteResultBannerProps) {
  if (!result) {
    return null;
  }

  const variant =
    result.status === "sent" ? "success" : result.status === "queued" ? "info" : "error";

  return (
    <AlertBanner variant={variant} size="sm">
      {result.message}
      {result.inviteUrl ? (
        <code className="mt-1.5 block select-all break-all rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">
          {result.inviteUrl}
        </code>
      ) : null}
    </AlertBanner>
  );
}
