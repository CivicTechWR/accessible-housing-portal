"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import { saveAccountAction, manageAccountAction } from "@/app/admin/users/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteRoleOptions } from "@/components/admin-invite/types";
import {
  DialogOverlay,
  DialogPanel,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog-shell";
import type { AccountListResponse } from "@/shared/schemas/account-management";

export function AdminAccountActions({ account }: { account: AccountListResponse["data"][number] }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const id = useId();
  async function run(operation: () => Promise<{ error?: string; message?: string }>) {
    setPending(true);
    setMessage("");
    try {
      const result = await operation();
      setMessage(result.error ?? result.message ?? "Saved.");
      if (!result.error) router.refresh();
    } catch {
      setMessage("Unable to complete this action. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Manage ${account.name ?? account.email ?? "user"}`}
        onClick={() => {
          setOpen(true);
          setMessage("");
        }}
      >
        Manage
      </Button>
      {open && (
        <DialogOverlay open={open} onOpenChange={setOpen}>
          <DialogPanel className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage user</DialogTitle>
              <DialogDescription>{account.email}</DialogDescription>
            </DialogHeader>
            <div className="space-y-5 p-6">
              {message && (
                <p role="status" className="text-sm">
                  {message}
                </p>
              )}
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  void run(() => saveAccountAction(account.id, data));
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor={`${id}-name`}>Name</Label>
                  <Input id={`${id}-name`} name="name" defaultValue={account.name ?? ""} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${id}-organization`}>Organization</Label>
                  <Input
                    id={`${id}-organization`}
                    name="organization"
                    defaultValue={account.organization ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${id}-role`}>Role</Label>
                  <Select name="role" defaultValue={account.role ?? "user"}>
                    <SelectTrigger id={`${id}-role`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {inviteRoleOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${id}-status`}>Status</Label>
                  <Select name="status" defaultValue={account.status ?? "invited"}>
                    <SelectTrigger id={`${id}-status`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {/** Accepted invitations are terminal: returning to invited
                        leaves sign-in and recovery disabled with re-invitation
                        rejected, so hide the option once inviteAcceptedAt is set. */}
                      {(account.status === "invited" || !account.inviteAcceptedAt) && (
                        <SelectItem value="invited">Invited</SelectItem>
                      )}
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="deactivated">Deactivated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {account.status !== "invited" && Boolean(account.inviteAcceptedAt) && (
                  <p className="text-sm text-muted-foreground">
                    This account already accepted its invitation and cannot return to invited.
                    Restore active instead.
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Suspending or deactivating this account signs out its devices. You cannot remove
                  your own admin access.
                </p>
                <Button disabled={pending}>Save changes</Button>
              </form>
              <div className="flex flex-wrap gap-2 border-t pt-4">
                {account.status === "invited" && (
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() => void run(() => manageAccountAction(account.id, "invite"))}
                  >
                    Send new invitation
                  </Button>
                )}
                {account.status === "active" && (
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      void run(() => manageAccountAction(account.id, "reset-password"))
                    }
                  >
                    Send password reset
                  </Button>
                )}
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => void run(() => manageAccountAction(account.id, "revoke-sessions"))}
                >
                  Sign out all devices
                </Button>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogPanel>
        </DialogOverlay>
      )}
    </>
  );
}
