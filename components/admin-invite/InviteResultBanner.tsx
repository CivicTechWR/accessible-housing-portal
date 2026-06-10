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
    </AlertBanner>
  );
}
