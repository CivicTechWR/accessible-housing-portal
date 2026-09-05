import { Input } from "@/components/ui/input";
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
      <p>{result.message}</p>
      {result.inviteUrl && (
        <div className="mt-3 space-y-1">
          <label htmlFor="created-invite-url" className="text-xs">
            Invitation link, select to copy
          </label>
          <Input
            id="created-invite-url"
            readOnly
            value={result.inviteUrl}
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
      )}
    </AlertBanner>
  );
}
