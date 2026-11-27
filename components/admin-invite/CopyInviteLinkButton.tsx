"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, Link01Icon } from "@hugeicons/core-free-icons";

import { manageInviteAction } from "@/app/admin/users/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CopyState =
  | { status: "idle" | "pending" | "copied" }
  | { status: "manual"; url: string }
  | { status: "error"; message: string };

/**
 * Fetches a pending invitation's link and copies it. If the clipboard is blocked, the link shows
 * in a read-only field to copy by hand.
 */
export function CopyInviteLinkButton({ inviteId, email }: { inviteId: string; email: string }) {
  const [state, setState] = useState<CopyState>({ status: "idle" });

  useEffect(() => {
    if (state.status !== "copied") return;
    const timeout = window.setTimeout(() => setState({ status: "idle" }), 2500);
    return () => window.clearTimeout(timeout);
  }, [state.status]);

  async function copy() {
    setState({ status: "pending" });
    try {
      const result = await manageInviteAction(inviteId, "copy");
      if (!result.url) {
        setState({ status: "error", message: result.error ?? "The link isn't available." });
        return;
      }
      try {
        await navigator.clipboard.writeText(result.url);
        setState({ status: "copied" });
      } catch {
        setState({ status: "manual", url: result.url });
      }
    } catch {
      setState({ status: "error", message: "Unable to get the link. Please try again." });
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="max-sm:h-11"
        disabled={state.status === "pending"}
        onClick={() => void copy()}
      >
        <HugeiconsIcon
          icon={state.status === "copied" ? CheckmarkCircle02Icon : Link01Icon}
          strokeWidth={2}
          data-icon="inline-start"
          aria-hidden
        />
        {state.status === "copied" ? "Copied" : "Copy link"}
        <span className="sr-only"> for {email}</span>
      </Button>
      {/* The button already says "Copied", so that message is for screen readers only. */}
      <p role="status" className={state.status === "copied" ? "sr-only" : "text-sm empty:hidden"}>
        {state.status === "copied"
          ? "Link copied."
          : state.status === "manual"
            ? "Select and copy the link below."
            : state.status === "error"
              ? state.message
              : ""}
      </p>
      {state.status === "manual" ? (
        <Input
          aria-label="Invitation link"
          readOnly
          value={state.url}
          onFocus={(event) => event.currentTarget.select()}
        />
      ) : null}
    </div>
  );
}
