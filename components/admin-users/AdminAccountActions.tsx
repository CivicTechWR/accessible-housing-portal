"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import { saveAccountAction, manageAccountAction } from "@/app/admin/users/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
        variant="outline"
        size="sm"
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
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  void run(() => saveAccountAction(account.id, data));
                }}
              >
                <label htmlFor={`${id}-name`}>Name</label>
                <Input id={`${id}-name`} name="name" defaultValue={account.name ?? ""} required />
                <label htmlFor={`${id}-organization`}>Organization</label>
                <Input
                  id={`${id}-organization`}
                  name="organization"
                  defaultValue={account.organization ?? ""}
                />
                <label htmlFor={`${id}-role`}>Role</label>
                <select
                  id={`${id}-role`}
                  name="role"
                  defaultValue={account.role ?? "user"}
                  className="w-full rounded-md border bg-background p-2"
                >
                  <option value="user">Housing Searcher</option>
                  <option value="partner">Housing Lister</option>
                  <option value="admin">Admin</option>
                </select>
                <label htmlFor={`${id}-status`}>Status</label>
                <select
                  id={`${id}-status`}
                  name="status"
                  defaultValue={account.status ?? "invited"}
                  className="w-full rounded-md border bg-background p-2"
                >
                  <option value="invited">Invited</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="deactivated">Deactivated</option>
                </select>
                <p className="text-xs text-muted-foreground">
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
