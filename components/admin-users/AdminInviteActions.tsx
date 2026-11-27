"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { manageInviteAction } from "@/app/admin/users/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Link01Icon,
  MailSend01Icon,
  MoreHorizontalIcon,
} from "@hugeicons/core-free-icons";

export function AdminInviteActions({
  inviteId,
  inviteeLabel,
  available,
  canResend,
}: {
  inviteId: string;
  /** The invitee's name or email, for the menu button's accessible name. */
  inviteeLabel: string;
  available: boolean;
  canResend: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const router = useRouter();
  async function run(action: "copy" | "revoke" | "resend") {
    setPending(true);
    setMessage("");
    setUrl("");
    try {
      const result = await manageInviteAction(inviteId, action);
      if (result.url) {
        setUrl(result.url);
        try {
          await navigator.clipboard.writeText(result.url);
          setMessage("Link copied.");
        } catch {
          setMessage("Select and copy the link below.");
        }
      } else {
        setMessage(result.error ?? result.message ?? "Saved.");
        router.refresh();
      }
    } catch {
      setMessage("Unable to complete this action. Please try again.");
    } finally {
      setPending(false);
    }
  }
  if (!available && !canResend) {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            aria-label={`Actions for the invitation to ${inviteeLabel}`}
            disabled={pending}
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {available && (
            <DropdownMenuItem onSelect={() => void run("copy")}>
              <HugeiconsIcon icon={Link01Icon} strokeWidth={2} aria-hidden />
              Copy link
            </DropdownMenuItem>
          )}
          {canResend && (
            <DropdownMenuItem onSelect={() => void run("resend")}>
              <HugeiconsIcon icon={MailSend01Icon} strokeWidth={2} aria-hidden />
              Send new invite
            </DropdownMenuItem>
          )}
          {available && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => void run("revoke")}>
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} aria-hidden />
                Revoke
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {message && (
        <p role="status" className="text-right text-sm">
          {message}
        </p>
      )}
      {url && (
        <Input
          aria-label="Invitation link"
          className="w-64"
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
        />
      )}
    </div>
  );
}
