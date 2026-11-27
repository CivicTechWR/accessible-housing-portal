"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SubmitErrorHandler } from "react-hook-form";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  ArrowExpand01Icon,
  ArrowShrink02Icon,
  CheckmarkCircle02Icon,
  LinkSquare02Icon,
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
import { BackLink } from "@/components/ui/back-link";
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

  // The preview card unmounts when it opens the full page, which would drop focus to <body>.
  // Focus moves to the preview header's toggle instead, which switches back. The toggle stays
  // mounted and keeps focus when it's the control pressed.
  const previewToggleRef = useRef<HTMLButtonElement>(null);
  const isPreviewFocusWanted = useRef(false);
  const handlePreviewOpenDetails = () => {
    isPreviewFocusWanted.current = true;
    handleOpenDetails();
  };
  useEffect(() => {
    if (!isPreviewFocusWanted.current) return;
    isPreviewFocusWanted.current = false;
    // preventScroll keeps the focus move from cutting short the smooth scroll to the top.
    previewToggleRef.current?.focus({ preventScroll: true });
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
  // isDirty compares the whole form to its loaded values and can stay true after an edit is
  // undone, so the publish state goes by the fields that still differ.
  const hasUnpublishedChanges = Object.keys(form.formState.dirtyFields).length > 0;
  const isPreviewExpanded = previewMode === "details";
  const isDraft = liveFormData.status === "draft";
  // A published listing doesn't autosave: edits stay private until the partner publishes them.
  // Drafts and archived listings autosave, and publishing puts them on the site.
  const isPublished = isEditMode && liveFormData.status === "published";
  const formHeading = !isEditMode ? "New listing" : isDraft ? "Edit draft" : "Edit listing";
  const formDescription = isPublished
    ? "Navigators see your edits once you publish them."
    : isDraft
      ? "Your draft saves automatically. Publish it when the listing is ready."
      : "Changes save automatically. Publish the listing to show it on the site again.";
  const submitLabel = isPublished ? "Publish changes" : "Publish listing";
  // A published listing with nothing new has nothing to publish, so the bar links to it instead.
  const isUpToDate = isPublished && !hasUnpublishedChanges;
  const sections = listingFormSections(liveFormData);

  // Publishing swaps the focused Publish button for the View listing link. Focus follows it
  // instead of dropping to <body>.
  const viewListingRef = useRef<HTMLAnchorElement>(null);
  const hasPublished = useRef(false);
  useEffect(() => {
    if (isSubmitting) hasPublished.current = true;
  }, [isSubmitting]);
  useEffect(() => {
    if (!isUpToDate || !hasPublished.current) return;
    hasPublished.current = false;
    if (!document.activeElement || document.activeElement === document.body) {
      viewListingRef.current?.focus({ preventScroll: true });
    }
  }, [isUpToDate]);

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
        <div className="space-y-2">
          <BackLink href="/my-listings">My listings</BackLink>
          <PageHeader
            // On phones the sticky bar already says how saving works, so the subtitle goes.
            className="max-sm:[&_p]:hidden"
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
      previewPaneHeader={
        // The description sits under the title and button so the narrow preview column doesn't
        // squeeze it into a tall stack.
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h2 className="text-base">Live preview</h2>
          <Button
            ref={previewToggleRef}
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreviewToggle}
            className="shrink-0 max-lg:h-11"
          >
            <HugeiconsIcon
              icon={isPreviewExpanded ? ArrowShrink02Icon : ArrowExpand01Icon}
              strokeWidth={2}
              data-icon="inline-start"
              aria-hidden
            />
            {isPreviewExpanded ? "Show card preview" : "Show full page"}
          </Button>
          <p className="w-full text-sm text-muted-foreground">
            How navigators will see this listing.
          </p>
        </div>
      }
      formContent={
        <Form {...form}>
          <form
            id="listing-form"
            className="space-y-6 max-sm:space-y-0"
            onSubmit={form.handleSubmit(onSubmit, handleInvalidSubmit)}
          >
            {/* Sighted users read the asterisks and the section strip's counts. */}
            <p className="sr-only">Fields marked with an asterisk are required.</p>
            {/* Accessibility comes second, right after the unit itself, so it isn't skipped. */}
            <ListingFormFields control={form.control} categories={["listing_details"]} />
            <ListingFormFeatures control={form.control} />
            <ListingFormFields
              control={form.control}
              categories={["property_info", "application"]}
            />
            <ListingFormImages
              control={form.control}
              listingId={activeListingId}
              activateDraftListing={activateDraftListing}
              prepareDraftListing={prepareDraftListing}
            />
          </form>
        </Form>
      }
      previewContent={
        <ListingFormPreview
          mode={previewMode}
          formData={liveFormData}
          listingId={activeListingId}
          onOpenDetails={handlePreviewOpenDetails}
        />
      }
      footer={
        <>
          {isPublished ? (
            <PublishState isDirty={hasUnpublishedChanges} />
          ) : (
            <SaveState
              autosaveStatus={autosaveStatus}
              isDirty={isDirty}
              isSaved={isEditMode || activeListingId !== undefined}
            />
          )}
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
        </>
      }
      footerAction={
        <>
          {isUpToDate && activeListingId ? (
            // Opens the public page in a new tab, so the editor stays where it was.
            <Button asChild variant="outline" className="max-sm:h-11">
              <Link
                ref={viewListingRef}
                href={`/listings/${activeListingId}`}
                target="_blank"
                rel="noopener"
              >
                View listing
                <span className="sr-only"> (opens in a new tab)</span>
                <HugeiconsIcon
                  icon={LinkSquare02Icon}
                  strokeWidth={2}
                  data-icon="inline-end"
                  aria-hidden
                />
              </Link>
            </Button>
          ) : (
            <Button
              type="submit"
              form="listing-form"
              disabled={isSubmitting}
              className="max-sm:h-11"
            >
              {isSubmitting ? "Publishing..." : submitLabel}
            </Button>
          )}
        </>
      }
    />
  );
}

/** The section nav's entries, with how much of each section is filled in. */
function listingFormSections(values: ListingFormInput): ListingFormSectionLink[] {
  const coreSections = CORE_FIELD_CATEGORIES.map((category): ListingFormSectionLink => {
    const required = CORE_FIELD_DEFINITIONS.filter(
      (definition) => definition.category === category.key && definition.isRequired,
    );
    const filled = required.filter((definition) => hasValue(values[definition.key])).length;
    const id = listingFormSectionId(category.key);
    const labels = { label: category.displayName };
    if (required.length === 0) {
      // An optional section counts as done once anything in it is filled in.
      const hasContent = CORE_FIELD_DEFINITIONS.some(
        (definition) => definition.category === category.key && hasValue(values[definition.key]),
      );
      return hasContent
        ? { id, ...labels, meta: "Filled in", status: "complete" }
        : { id, ...labels, meta: "Optional", status: "optional" };
    }
    return {
      id,
      ...labels,
      meta: `${filled} of ${required.length} required`,
      status: filled === required.length ? "complete" : "incomplete",
    };
  });
  const photoCount = values.images?.length ?? 0;
  const featureCount = values.customFeatures?.length ?? 0;
  const [detailsSection, ...otherCoreSections] = coreSections;

  return [
    ...(detailsSection ? [detailsSection] : []),
    {
      id: listingFormSectionId("features"),
      label: "Features and accessibility",
      meta: featureCount === 0 ? "Recommended" : `${featureCount} selected`,
      status: featureCount === 0 ? "recommended" : "complete",
    },
    ...otherCoreSections,
    {
      id: listingFormSectionId("images"),
      label: "Photos",
      meta:
        photoCount === 0 ? "None yet" : `${photoCount} ${photoCount === 1 ? "photo" : "photos"}`,
      status: photoCount > 0 ? "complete" : "incomplete",
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

/** One short line: 13px on phones, where it sits above the buttons, and 14px beside them from sm. */
const SAVE_STATE_CLASS =
  "mr-auto flex min-h-5 min-w-0 max-w-full items-center gap-2 text-xs sm:text-sm";

/** The sticky bar's state for a published listing, which only changes when it's published. */
function PublishState({ isDirty }: { isDirty: boolean }) {
  return (
    <div
      className={cn(
        SAVE_STATE_CLASS,
        isDirty ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted-foreground",
      )}
    >
      <SaveStateIcon status={isDirty ? "dirty" : "saved"} />
      <p className="truncate" role="status" aria-live="polite">
        {isDirty ? "Unpublished changes" : "Up to date"}
      </p>
    </div>
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

/** The autosave state on the left of the sticky bar, for drafts and archived listings. */
function SaveState({
  autosaveStatus,
  isDirty,
  isSaved,
}: {
  autosaveStatus: AutosaveStatus | null;
  isDirty: boolean;
  /** Whether the listing exists on the server yet. */
  isSaved: boolean;
}) {
  const savedAt = autosaveStatus?.status === "saved" ? autosaveStatus.savedAt : null;
  const now = useNow(savedAt !== null);
  const status = autosaveStatus?.status ?? (isDirty ? null : isSaved ? "saved" : null);

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
      text = isDirty ? null : isSaved ? "All changes saved" : "Draft saves as you type";
  }

  return (
    <div
      className={cn(
        SAVE_STATE_CLASS,
        status === "error" ? "text-destructive" : "text-muted-foreground",
      )}
    >
      <SaveStateIcon status={status} />
      {/* Always rendered so screen readers pick up the first change. One line on phones and two
          at most beside the buttons, so a long error never makes the sticky bar grow; the title
          shows the rest. The relative time sits outside the live region so its updates aren't
          announced every half minute. */}
      <p
        className="truncate sm:line-clamp-2 sm:whitespace-normal"
        title={text ?? undefined}
        role="status"
        aria-live="polite"
      >
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
