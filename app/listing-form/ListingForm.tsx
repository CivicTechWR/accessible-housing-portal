"use client";

import { useState } from "react";
import type { SubmitErrorHandler } from "react-hook-form";
import { useListingForm } from "./useListingForm";
import { CORE_FIELD_DEFINITIONS } from "./fieldDefinitions";
import type { ListingFormInput } from "./types";
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
    isError,
    isSubmitting,
    submitFeedback,
    autosaveFeedback,
    listingId: activeListingId,
  } = useListingForm(listingId);
  const [previewMode, setPreviewMode] = useState<ListingFormPreviewMode>("card");
  const handleOpenDetails = () => {
    setPreviewMode("details");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const handleDividerToggle = () => {
    if (previewMode === "card") {
      handleOpenDetails();
      return;
    }

    setPreviewMode("card");
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  };
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

      fieldContainer?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      const focusTarget =
        fieldContainer?.querySelector<HTMLElement>(
          "input, textarea, button, [tabindex]:not([tabindex='-1'])",
        ) ?? fieldContainer;
      focusTarget?.focus({ preventScroll: true });
      form.setFocus(firstInvalidField);
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

  if (isError) {
    return (
      <ListingFormLayout
        formContent={
          <AlertBanner variant="error" size="lg">
            <h3 className="mb-2">Error Loading Listing</h3>
            <p>
              {isEditMode
                ? "We encountered an error while retrieving this listing. It may have been deleted or there is a network issue."
                : "We encountered an error while preparing this form. Please refresh and try again."}
            </p>
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
          onOpenDetails={handleOpenDetails}
        />
      }
      footer={
        <div className="flex items-center gap-3">
          {autosaveFeedback ? (
            <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
              {autosaveFeedback}
            </p>
          ) : null}
          {submitFeedback && (
            <p
              className={
                submitFeedback.status === "success"
                  ? "text-sm text-emerald-700"
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

function escapeAttributeValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
