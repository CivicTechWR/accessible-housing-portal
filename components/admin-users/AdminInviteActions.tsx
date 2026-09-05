"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { manageInviteAction } from "@/app/admin/users/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminInviteActions({
  inviteId,
  available,
  canResend,
}: {
  inviteId: string;
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
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {available && (
          <Button variant="outline" size="sm" disabled={pending} onClick={() => void run("copy")}>
            Copy link
          </Button>
        )}
        {canResend && (
          <Button variant="outline" size="sm" disabled={pending} onClick={() => void run("resend")}>
            Send new invite
          </Button>
        )}
        {available && (
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => void run("revoke")}>
            Revoke
          </Button>
        )}
      </div>
      {message && (
        <p role="status" className="text-xs">
          {message}
        </p>
      )}
      {url && (
        <Input
          aria-label="Invitation link"
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
        />
      )}
    </div>
  );
}
