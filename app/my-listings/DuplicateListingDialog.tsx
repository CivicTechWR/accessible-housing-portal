"use client";

import { useId, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";

import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPanel,
  DialogTitle,
  useDialogOpenerFocus,
} from "@/components/ui/dialog-shell";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_LISTING_DUPLICATE_COPY_PHOTOS,
  DEFAULT_LISTING_DUPLICATE_SCOPE,
  type ListingDuplicateScope,
} from "@/shared/schemas/listings";

export type DuplicateListingSelection = {
  scope: ListingDuplicateScope;
  copyPhotos: boolean;
};

type DuplicateListingDialogProps = {
  listing: {
    title: string;
    unitNumber?: string;
    imageCount: number;
  };
  isDuplicating: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: (selection: DuplicateListingSelection) => void;
};

const SCOPE_OPTIONS: Array<{
  value: ListingDuplicateScope;
  label: string;
  description: string;
}> = [
  {
    value: "all",
    label: "All fields",
    description: "Building information, unit details, and accessibility features.",
  },
  {
    value: "building",
    label: "Building information only",
    description: "Address, building details, contact information, and shared amenities.",
  },
];

export function DuplicateListingDialog({
  listing,
  isDuplicating,
  errorMessage,
  onCancel,
  onConfirm,
}: DuplicateListingDialogProps) {
  const restoreFocusToOpener = useDialogOpenerFocus();
  const scopeLabelId = useId();
  const photosLabelId = useId();
  const [scope, setScope] = useState<ListingDuplicateScope>(DEFAULT_LISTING_DUPLICATE_SCOPE);
  const [copyPhotos, setCopyPhotos] = useState(DEFAULT_LISTING_DUPLICATE_COPY_PHOTOS);
  const sourceLabel = getDuplicateSourceLabel(listing);
  const hasPhotos = listing.imageCount > 0;

  function handleOpenChange(open: boolean) {
    if (!open && !isDuplicating) {
      onCancel();
    }
  }

  function handleDismiss(event: Event) {
    event.stopPropagation();

    if (isDuplicating) {
      event.preventDefault();
    }
  }

  return (
    <DialogOverlay open onOpenChange={handleOpenChange}>
      <DialogPanel
        className="max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto"
        onCloseAutoFocus={restoreFocusToOpener}
        onEscapeKeyDown={handleDismiss}
        onInteractOutside={handleDismiss}
      >
        <DialogHeader className="border-b-0 pb-0">
          <DialogTitle>Duplicate listing</DialogTitle>
          <DialogDescription>
            Create a new draft from {sourceLabel}. You can review and edit it before publishing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          {errorMessage ? (
            <AlertBanner variant="error" size="default" className="rounded-lg">
              {errorMessage}
            </AlertBanner>
          ) : null}

          <div className="space-y-3">
            <p id={scopeLabelId} className="text-sm font-medium">
              What would you like to copy?
            </p>
            <RadioGroup
              aria-labelledby={scopeLabelId}
              value={scope}
              onValueChange={(value) => setScope(value as ListingDuplicateScope)}
              disabled={isDuplicating}
            >
              {SCOPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-3 text-sm has-disabled:cursor-not-allowed has-disabled:opacity-70"
                >
                  <RadioGroupItem value={option.value} className="mt-0.5" />
                  <span className="space-y-1">
                    <span className="block font-medium">{option.label}</span>
                    <span className="block text-muted-foreground">{option.description}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1 text-sm">
              <p id={photosLabelId} className="font-medium">
                Copy photos?
              </p>
              <p className="text-muted-foreground">
                {hasPhotos
                  ? `The ${listing.imageCount} ${pluralizePhotos(listing.imageCount)} from ${sourceLabel} will be added to the new draft.`
                  : `${sourceLabel} has no photos to copy.`}
              </p>
            </div>
            <Switch
              aria-labelledby={photosLabelId}
              checked={copyPhotos && hasPhotos}
              onCheckedChange={setCopyPhotos}
              disabled={isDuplicating || !hasPhotos}
            />
          </div>

          <p className="flex items-start gap-3 border-t border-border pt-5 text-sm">
            <HugeiconsIcon
              icon={InformationCircleIcon}
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span>
              {buildDuplicateListingSummary({
                scope,
                copyPhotos: copyPhotos && hasPhotos,
                photoCount: listing.imageCount,
              })}
            </span>
          </p>
        </div>

        <DialogFooter className="border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onCancel}
            disabled={isDuplicating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={isDuplicating}
            onClick={() => onConfirm({ scope, copyPhotos: copyPhotos && hasPhotos })}
          >
            <HugeiconsIcon icon={Copy01Icon} className="size-4" aria-hidden />
            {isDuplicating ? "Duplicating..." : "Duplicate as draft"}
          </Button>
        </DialogFooter>
      </DialogPanel>
    </DialogOverlay>
  );
}

export function buildDuplicateListingSummary(input: {
  scope: ListingDuplicateScope;
  copyPhotos: boolean;
  photoCount: number;
}) {
  const sentences: string[] = [];

  if (input.scope === "building") {
    sentences.push("Building information will be copied. Unit details will be left blank.");
  } else if (input.scope === "unit") {
    sentences.push("Unit information will be copied. Building details will be left blank.");
  } else {
    sentences.push("All fields will be copied.");
  }

  if (input.photoCount === 0) {
    sentences.push("There are no photos to copy.");
  } else if (input.copyPhotos) {
    sentences.push(
      `${input.photoCount} ${pluralizePhotos(input.photoCount)} will be copied to the new draft.`,
    );
  } else {
    sentences.push("Photos will not be copied.");
  }

  if (input.scope !== "building") {
    sentences.push("The unit number and availability date will be left blank.");
  }

  return sentences.join(" ");
}

function getDuplicateSourceLabel(listing: { title: string; unitNumber?: string }) {
  if (listing.unitNumber) {
    return `Unit ${listing.unitNumber}`;
  }

  return listing.title;
}

function pluralizePhotos(count: number) {
  return count === 1 ? "photo" : "photos";
}
