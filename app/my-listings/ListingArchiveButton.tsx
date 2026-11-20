"use client";

import { useEffect, useRef } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type ListingArchiveButtonProps = {
  isArchived: boolean;
  isMutating: boolean;
  pendingLabel: string;
  onArchive: () => void;
  onRestore: () => void;
};

// The Archive button, which asks for confirmation first, or the Restore button once the listing
// is archived. Render it at the same position in both states so it stays mounted across the change.
export function ListingArchiveButton({
  isArchived,
  isMutating,
  pendingLabel,
  onArchive,
  onRestore,
}: ListingArchiveButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const focusWhenSettled = useRef(false);

  // Confirming unmounts both the dialog and the Archive button, and the button that replaces them
  // is disabled until the request settles, so focus is left on <body>. Move it to the button this
  // listing ends up with: Restore, or Archive again if the request failed. isArchived is a
  // dependency because a request can settle before the pending state has rendered.
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
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button ref={buttonRef} type="button" variant="outline" disabled={isMutating}>
          {isMutating ? pendingLabel : "Archive"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive this listing?</AlertDialogTitle>
          <AlertDialogDescription>
            It will be kept in an archived state and can be restored later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
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
  );
}
