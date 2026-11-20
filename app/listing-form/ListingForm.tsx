"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SubmitErrorHandler } from "react-hook-form";
import { useListingForm, type AutosaveStatus } from "./useListingForm";
import { CORE_FIELD_DEFINITIONS } from "./fieldDefinitions";
import type { ListingFormInput } from "./types";
import type { ListingLoadError } from "./useGetListingQuery";
import { ListingFormFields } from "@/components/listing-form-fields/ListingFormFields";
import { ListingFormFeatures } from "@/components/listing-form-features/ListingFormFeatures";
import { ListingFormImages } from "@/components/listing-form-images/ListingFormImages";
import { ListingFormLayout } from "@/components/listing-form-layout/ListingFormLayout";
import {
  ListingFormPreview,
  type ListingFormPreviewMode,
} from "@/components/listing-form-preview/ListingFormPreview";
import { ListingFormSkeleton } from "@/components/listing-form-skeleton/ListingFormSkeleton";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export interface ListingFormProps {
  listingId?: string;
}

export default function ListingForm({ listingId }: ListingFormProps) {
  const isEditMode = Boolean(listingId);
  const {
    form,
    onSubmit,
    activateDraftListing,
    prepareDraftListing,
    isLoading,
    loadError,
    isSubmitting,
    submitFeedback,
    autosaveStatus,
    listingId: activeListingId,
  } = useListingForm(listingId);
  const [previewMode, setPreviewMode] = useState<ListingFormPreviewMode>("card");
  const handleOpenDetails = () => {
    setPreviewMode("details");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const handleCloseDetails = () => {
    setPreviewMode("card");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const handleDividerToggle = () => {
    if (previewMode === "card") {
      handleOpenDetails();
      return;
    }

    handleCloseDetails();
  };

  // The preview card and the "Back to card preview" button unmount when they switch the preview,
  // which would drop focus to <body>. Focus moves to the control that reverses the switch instead.
  // The divider stays mounted and keeps focus, so it never asks for this.
  const previewCardButtonRef = useRef<HTMLButtonElement>(null);
  const previewBackButtonRef = useRef<HTMLButtonElement>(null);
  const dividerButtonRef = useRef<HTMLButtonElement>(null);
  const isPreviewFocusWanted = useRef(false);
  const handlePreviewOpenDetails = () => {
    isPreviewFocusWanted.current = true;
    handleOpenDetails();
  };
  const handlePreviewCloseDetails = () => {
    isPreviewFocusWanted.current = true;
    handleCloseDetails();
  };
  useEffect(() => {
    if (!isPreviewFocusWanted.current) return;
    isPreviewFocusWanted.current = false;

    // preventScroll keeps the focus move from cutting short the smooth scroll to the top.
    if (previewMode === "card") {
      previewCardButtonRef.current?.focus({ preventScroll: true });
      return;
    }

    // The Back button is hidden at lg and up, where focus() on it does nothing and the divider
    // is the control that returns to the card.
    const backButton = previewBackButtonRef.current;
    backButton?.focus({ preventScroll: true });
    if (document.activeElement !== backButton) {
      dividerButtonRef.current?.focus({ preventScroll: true });
    }
  }, [previewMode]);
  const handleInvalidSubmit: SubmitErrorHandler<ListingFormInput> = (errors) => {
    const firstInvalidField =
      CORE_FIELD_DEFINITIONS.find((definition) => errors[definition.key])?.key ??
      (Object.keys(errors)[0] as keyof ListingFormInput | undefined);

    if (!firstInvalidField) {
      return;
    }

    window.requestAnimationFrame(() => {
      const formElement = document.getElementById("listing-form");
      const fieldContainer = formElement?.querySelector<HTMLElement>(
        `[data-field-name="${escapeAttributeValue(String(firstInvalidField))}"]`,
      );

      const focusTarget =
        fieldContainer?.querySelector<HTMLElement>(
          "input, textarea, button, [tabindex]:not([tabindex='-1'])",
        ) ?? fieldContainer;
      focusTarget?.focus({ preventScroll: true });
      form.setFocus(firstInvalidField);

      // Scroll after focusing: ListingFormLayout scrolls focused textareas into view
      // instantly, which would cancel an earlier smooth scroll.
      fieldContainer?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  const liveFormData = form.watch();
  const isPreviewExpanded = previewMode === "details";
  const previewToggleLabel = isPreviewExpanded
    ? "Hide Listing Details Page Preview"
    : "Show Listing Page Preview";
  const formHeading =
    liveFormData.status === "draft"
      ? "Draft Listing"
      : isEditMode
        ? "Update Listing"
        : "Create New Listing";
  const submitLabel =
    liveFormData.status === "draft"
      ? "Publish Listing"
      : isEditMode
        ? "Save Changes"
        : "Create Listing";

  if (isLoading) {
    return <ListingFormSkeleton />;
  }

  if (loadError) {
    return (
      <ListingFormLayout
        formContent={
          <AlertBanner variant="error" size="lg">
            <ListingLoadErrorMessage error={loadError} />
          </AlertBanner>
        }
      />
    );
  }

  return (
    <ListingFormLayout
      isPreviewExpanded={isPreviewExpanded}
      formPaneHeader={
        <div>
          <h2>{formHeading}</h2>
          <p className="text-xs text-muted-foreground">
            Enter listing details, images, and accessibility information.
          </p>
        </div>
      }
      previewPaneHeader={
        <div>
          <h2>Live Preview</h2>
          <p className="text-xs text-muted-foreground">
            Read-only view of how this listing appears to housing searchers.
          </p>
        </div>
      }
      dividerControl={
        <Button
          ref={dividerButtonRef}
          type="button"
          variant="secondary"
          onClick={handleDividerToggle}
          aria-label={previewToggleLabel}
          className="h-full min-h-[460px] w-full rounded-none border-0 px-0 py-0 hover:bg-muted/40"
        >
          <div className="h-full w-full">
            <div className="sticky top-1/2 flex -translate-y-1/2 flex-col items-center gap-3">
              <span className="text-xs leading-none text-muted-foreground" aria-hidden>
                {isPreviewExpanded ? ">>" : "<<"}
              </span>
              <span className="text-[10px] uppercase tracking-[0.14em] [writing-mode:vertical-rl] rotate-180">
                {previewToggleLabel}
              </span>
              <span className="text-xs leading-none text-muted-foreground" aria-hidden>
                {isPreviewExpanded ? ">>" : "<<"}
              </span>
            </div>
          </div>
        </Button>
      }
      formContent={
        <Form {...form}>
          <form id="listing-form" onSubmit={form.handleSubmit(onSubmit, handleInvalidSubmit)}>
            <ListingFormFields control={form.control} />
            <ListingFormImages
              control={form.control}
              listingId={activeListingId}
              activateDraftListing={activateDraftListing}
              prepareDraftListing={prepareDraftListing}
            />
            <ListingFormFeatures control={form.control} />
          </form>
        </Form>
      }
      previewContent={
        <ListingFormPreview
          mode={previewMode}
          formData={liveFormData}
          listingId={activeListingId}
          onOpenDetails={handlePreviewOpenDetails}
          onCloseDetails={handlePreviewCloseDetails}
          cardButtonRef={previewCardButtonRef}
          backButtonRef={previewBackButtonRef}
        />
      }
      footer={
        <div className="flex min-w-0 items-center gap-3">
          {/* Always rendered so screen readers pick up the first change. Two lines of text-xs/4
              match the button's height, so a long error never makes the sticky bar taller. */}
          <p
            className={cn(
              "line-clamp-2 min-w-0 text-xs/4",
              autosaveStatus?.status === "error" ? "text-destructive" : "text-muted-foreground",
            )}
            role="status"
            aria-live="polite"
          >
            {autosaveStatus ? autosaveStatusText(autosaveStatus) : null}
          </p>
          {submitFeedback && (
            <p
              className={
                submitFeedback.status === "success"
                  ? "text-sm text-emerald-700 dark:text-emerald-400"
                  : "text-sm text-destructive"
              }
              role="status"
              aria-live="polite"
            >
              {submitFeedback.message}
            </p>
          )}
          <Button type="submit" form="listing-form" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
        </div>
      }
    />
  );
}

function ListingLoadErrorMessage({ error }: { error: ListingLoadError }): React.JSX.Element {
  switch (error.kind) {
    case "not-found":
      return (
        <>
          <h3 className="mb-2">Listing not found</h3>
          <p>This listing doesn't exist or belongs to another account.</p>
          <Button asChild size="lg" className="mt-4">
            <Link href="/my-listings">Back to My Listings</Link>
          </Button>
        </>
      );
    case "unavailable":
      return (
        <>
          <h3 className="mb-2">This listing couldn't be loaded</h3>
          {/* The wording changes after a failed retry so the alert is announced again. */}
          <p>
            {error.hasRetryFailed ? "That didn't work. " : null}
            Check your connection and try again.
          </p>
          {/* aria-disabled, not disabled: disabling the focused button drops keyboard focus. */}
          <Button
            type="button"
            size="lg"
            className="mt-4 aria-disabled:opacity-50"
            aria-disabled={error.isRetrying}
            onClick={error.isRetrying ? undefined : error.retry}
          >
            {error.isRetrying ? "Trying again..." : "Try again"}
          </Button>
        </>
      );
  }
}

function autosaveStatusText(autosaveStatus: AutosaveStatus) {
  switch (autosaveStatus.status) {
    case "saving":
      return "Saving...";
    case "saved":
      return "Saved";
    case "error":
      return `Not saved. ${autosaveStatus.message}`;
  }
}

function escapeAttributeValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
