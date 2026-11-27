"use client";

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Archive02Icon, Copy01Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ListingActionsMenuProps = {
  listingTitle: string;
  isArchived: boolean;
  isMutating: boolean;
  isDuplicating: boolean;
  pendingLabel: string;
  onDuplicate: () => void;
  onArchive: () => void;
  onRestore: () => void;
};

/**
 * The row's secondary actions: an overflow menu with Duplicate and Archive (which asks for
 * confirmation), or a Restore button once the listing is archived. Render it at the same
 * position in both states so it stays mounted across the change.
 */
export function ListingActionsMenu({
  listingTitle,
  isArchived,
  isMutating,
  isDuplicating,
  pendingLabel,
  onDuplicate,
  onArchive,
  onRestore,
}: ListingActionsMenuProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const focusWhenSettled = useRef(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Confirming unmounts the dialog and the menu button, and the button that replaces them is
  // disabled until the request settles, so focus is left on <body>. Move it to the button this
  // listing ends up with: Restore, or the menu button again if the request failed. isArchived is
  // a dependency because a request can settle before the pending state has rendered.
  useEffect(() => {
    if (isMutating || !focusWhenSettled.current) return;
    focusWhenSettled.current = false;
    // Leave focus alone if the user moved it somewhere else while the request was in flight.
    if (document.activeElement === document.body) buttonRef.current?.focus();
  }, [isMutating, isArchived]);

  if (isArchived) {
    return (
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        disabled={isMutating}
        onClick={onRestore}
      >
        {isMutating ? pendingLabel : "Restore"}
      </Button>
    );
  }

  return (
    <>
      {/* Not modal, so opening a dialog from an item doesn't leave the page inert. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            ref={buttonRef}
            type="button"
            variant="outline"
            size="icon"
            aria-label={`More actions for ${listingTitle}`}
            disabled={isMutating}
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={1.75} aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={isDuplicating}
            onSelect={() => {
              // The duplicate dialog returns focus to whatever had it when it opened.
              buttonRef.current?.focus();
              onDuplicate();
            }}
          >
            <HugeiconsIcon icon={Copy01Icon} strokeWidth={1.75} aria-hidden />
            {isDuplicating ? "Duplicating..." : "Duplicate"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setIsConfirmOpen(true)}>
            <HugeiconsIcon icon={Archive02Icon} strokeWidth={1.75} aria-hidden />
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            // The dialog opened from a menu item that no longer exists, so Radix would send focus
            // to <body>. Cancel and Escape return it to the menu button; confirming is handled by
            // the effect above once the request settles.
            event.preventDefault();
            if (!focusWhenSettled.current) buttonRef.current?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be kept in an archived state and can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                focusWhenSettled.current = true;
                onArchive();
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
