"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SubmitErrorHandler } from "react-hook-form";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  ArrowExpand01Icon,
  ArrowLeft01Icon,
  ArrowShrink02Icon,
  CheckmarkCircle02Icon,
  Loading03Icon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons";
import { useListingForm, type AutosaveStatus } from "./useListingForm";
import {
  CORE_FIELD_CATEGORIES,
  CORE_FIELD_DEFINITIONS,
  listingFormSectionId,
} from "./fieldDefinitions";
import type { ListingFormInput } from "./types";
import type { ListingLoadError } from "./useGetListingQuery";
import { ListingFormFields } from "@/components/listing-form-fields/ListingFormFields";
import { ListingFormFeatures } from "@/components/listing-form-features/ListingFormFeatures";
import { ListingFormImages } from "@/components/listing-form-images/ListingFormImages";
import { ListingFormLayout } from "@/components/listing-form-layout/ListingFormLayout";
import {
  ListingFormSectionJump,
  ListingFormSectionNav,
  type ListingFormSectionLink,
} from "@/components/listing-form-layout/ListingFormSectionNav";
import {
  ListingFormPreview,
  type ListingFormPreviewMode,
} from "@/components/listing-form-preview/ListingFormPreview";
import { ListingFormSkeleton } from "@/components/listing-form-skeleton/ListingFormSkeleton";
import { PageHeader } from "@/components/page-shell/AppPageShell";
import { AlertBanner } from "@/components/ui/alert-banner";
import { ListingStatusBadge } from "@/app/my-listings/ListingStatusBadge";
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
  const handlePreviewToggle = () => {
    if (previewMode === "card") {
      handleOpenDetails();
      return;
    }

    handleCloseDetails();
  };

  // The preview card and the "Back to card preview" button unmount when they switch the preview,
  // which would drop focus to <body>. Focus moves to the control that reverses the switch instead.
  // The preview header's toggle stays mounted and keeps focus, so it never asks for this.
  const previewCardButtonRef = useRef<HTMLButtonElement>(null);
  const previewBackButtonRef = useRef<HTMLButtonElement>(null);
  const previewToggleRef = useRef<HTMLButtonElement>(null);
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

    // The Back button is hidden at lg and up, where focus() on it does nothing and the preview
    // header's toggle is the control that returns to the card.
    const backButton = previewBackButtonRef.current;
    backButton?.focus({ preventScroll: true });
    if (document.activeElement !== backButton) {
      previewToggleRef.current?.focus({ preventScroll: true });
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
  const isDirty = form.formState.isDirty;
  const isPreviewExpanded = previewMode === "details";
  const isDraft = liveFormData.status === "draft";
  const formHeading = !isEditMode ? "New listing" : isDraft ? "Edit draft" : "Edit listing";
  const formDescription = isDraft
    ? "Your draft saves automatically. Publish it when the listing is ready."
    : "Changes go live when you save them.";
  const submitLabel = isDraft ? "Publish listing" : isEditMode ? "Save changes" : "Create listing";
  const sections = listingFormSections(liveFormData);

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
      header={
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2.5 text-muted-foreground">
            <Link href="/my-listings">
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                strokeWidth={2}
                data-icon="inline-start"
                aria-hidden
              />
              My listings
            </Link>
          </Button>
          <PageHeader
            title={
              <span className="flex flex-wrap items-center gap-3">
                {formHeading}
                {isEditMode ? <ListingStatusBadge status={liveFormData.status ?? "draft"} /> : null}
              </span>
            }
            description={formDescription}
          />
        </div>
      }
      sectionNav={<ListingFormSectionNav sections={sections} />}
      sectionJump={<ListingFormSectionJump sections={sections} />}
      previewPaneHeader={
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Live preview</h2>
            <p className="text-sm text-muted-foreground">How searchers will see this listing.</p>
          </div>
          {/* Below lg the preview's own Back button returns to the card. */}
          <Button
            ref={previewToggleRef}
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreviewToggle}
            className="hidden shrink-0 lg:inline-flex"
          >
            <HugeiconsIcon
              icon={isPreviewExpanded ? ArrowShrink02Icon : ArrowExpand01Icon}
              strokeWidth={2}
              data-icon="inline-start"
              aria-hidden
            />
            {isPreviewExpanded ? "Show card preview" : "Show full page"}
          </Button>
        </div>
      }
      formContent={
        <Form {...form}>
          <form
            id="listing-form"
            className="space-y-6"
            onSubmit={form.handleSubmit(onSubmit, handleInvalidSubmit)}
          >
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
        <>
          <SaveState
            autosaveStatus={autosaveStatus}
            isDirty={isDirty}
            isDraft={isDraft}
            isSaved={isEditMode || activeListingId !== undefined}
          />
          {submitFeedback && (
            <p
              className={cn(
                "hidden text-sm sm:block",
                submitFeedback.status === "success"
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-destructive",
              )}
              role="status"
              aria-live="polite"
            >
              {submitFeedback.message}
            </p>
          )}
          <Button type="submit" form="listing-form" disabled={isSubmitting} className="shrink-0">
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
        </>
      }
    />
  );
}

/** The section nav's entries, with how much of each section is filled in. */
function listingFormSections(values: ListingFormInput): ListingFormSectionLink[] {
  const coreSections = CORE_FIELD_CATEGORIES.map((category) => {
    const required = CORE_FIELD_DEFINITIONS.filter(
      (definition) => definition.category === category.key && definition.isRequired,
    );
    const filled = required.filter((definition) => hasValue(values[definition.key])).length;
    return {
      id: listingFormSectionId(category.key),
      label: category.displayName,
      meta: required.length > 0 ? `${filled} of ${required.length} required` : "Optional",
      isComplete: required.length > 0 && filled === required.length,
    };
  });
  const photoCount = values.images?.length ?? 0;
  const featureCount = values.customFeatures?.length ?? 0;

  return [
    ...coreSections,
    {
      id: listingFormSectionId("images"),
      label: "Photos",
      meta:
        photoCount === 0 ? "None yet" : `${photoCount} ${photoCount === 1 ? "photo" : "photos"}`,
      isComplete: photoCount > 0,
    },
    {
      id: listingFormSectionId("features"),
      label: "Features and accessibility",
      meta: `${featureCount} selected`,
    },
  ];
}

function hasValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function SaveStateIcon({ status }: { status: AutosaveStatus["status"] | "dirty" | null }) {
  if (!status) return null;
  const icon =
    status === "saving"
      ? Loading03Icon
      : status === "saved"
        ? CheckmarkCircle02Icon
        : status === "error"
          ? Alert02Icon
          : PencilEdit02Icon;
  return (
    <HugeiconsIcon
      icon={icon}
      strokeWidth={2}
      className={cn(
        "size-4 shrink-0",
        status === "saving" && "animate-spin",
        status === "saved" && "text-emerald-700 dark:text-emerald-400",
      )}
      aria-hidden
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
            <Link href="/my-listings">Back to my listings</Link>
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

/** Re-renders every half minute so relative times such as "2 min ago" stay current. */
function useNow(isActive: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isActive) return;
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, [isActive]);
  return now;
}

function formatSavedAgo(savedAt: number, now: number) {
  const minutes = Math.floor((now - savedAt) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  return `at ${new Date(savedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

/** The save state on the left of the sticky bar. */
function SaveState({
  autosaveStatus,
  isDirty,
  isDraft,
  isSaved,
}: {
  autosaveStatus: AutosaveStatus | null;
  isDirty: boolean;
  isDraft: boolean;
  /** Whether the listing exists on the server yet. */
  isSaved: boolean;
}) {
  const savedAt = autosaveStatus?.status === "saved" ? autosaveStatus.savedAt : null;
  const now = useNow(savedAt !== null);
  const status =
    autosaveStatus?.status ?? (isDirty ? (isDraft ? null : "dirty") : isSaved ? "saved" : null);

  let text: string | null;
  switch (autosaveStatus?.status) {
    case "saving":
      text = "Saving...";
      break;
    case "saved":
      text = "Draft saved";
      break;
    case "error":
      text = `Not saved. ${autosaveStatus.message}`;
      break;
    default:
      text = isDirty
        ? isDraft
          ? null
          : "Unsaved changes"
        : isSaved
          ? "All changes saved"
          : "Your draft saves as you type";
  }

  return (
    <div
      className={cn(
        "mr-auto flex min-w-0 items-center gap-2 text-sm",
        status === "error" ? "text-destructive" : "text-muted-foreground",
      )}
    >
      <SaveStateIcon status={status} />
      {/* Always rendered so screen readers pick up the first change. Two lines of text at most,
          so a long error never makes the sticky bar taller than its button. The relative time
          sits outside the live region so its updates aren't announced every half minute. */}
      <p className="line-clamp-2" role="status" aria-live="polite">
        {text}
        {savedAt !== null ? (
          <span aria-hidden className="hidden sm:inline">
            {" "}
            {formatSavedAgo(savedAt, now)}
          </span>
        ) : null}
      </p>
    </div>
  );
}

function escapeAttributeValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
