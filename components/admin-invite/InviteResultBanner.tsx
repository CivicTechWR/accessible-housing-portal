import type { InviteActionResult } from "@/components/admin-invite/types";
import { AlertBanner } from "@/components/ui/alert-banner";

type InviteResultBannerProps = {
  result: InviteActionResult | null;
};

export function InviteResultBanner({ result }: InviteResultBannerProps) {
  if (!result) {
    return null;
  }

  const isSuccess = result.status !== "error";

  return (
    <AlertBanner variant={isSuccess ? "success" : "error"} size="sm">
      {result.message}
    </AlertBanner>
  );
}
