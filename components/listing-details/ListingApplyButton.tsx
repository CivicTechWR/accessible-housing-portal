"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPanel,
  DialogTitle,
} from "@/components/ui/dialog-shell";

export function ListingApplyButton({ applicationUrl }: { applicationUrl: string }) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleConfirm = () => {
    window.location.assign(applicationUrl);
  };

  return (
    <>
      <Button type="button" size="sm" onClick={() => setIsConfirmOpen(true)}>
        Apply
      </Button>

      <DialogOverlay open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogPanel>
          <DialogHeader>
            <DialogTitle>Leaving Affordable Housing Portal</DialogTitle>
            <DialogDescription>
              You&apos;re now leaving the site. This will take you to:
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4">
            <p className="break-all rounded-md bg-muted px-3 py-2 text-sm font-medium text-foreground">
              {applicationUrl}
            </p>
          </div>
          <DialogFooter className="border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setIsConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" size="lg" onClick={handleConfirm}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogPanel>
      </DialogOverlay>
    </>
  );
}
