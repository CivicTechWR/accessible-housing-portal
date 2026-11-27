import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  getPendingAutosaveNullableFieldClearIntent,
  mapListingFormToAutosavePatchInput,
  mapListingFormToReplaceListingInput,
} from "./api";
import {
  listingFormSchema,
  ListingFormContext,
  ListingFormData,
  ListingFormInput,
  CREATE_FORM_DEFAULTS,
} from "./types";
import { useCreateDraftListingQuery } from "./useCreateDraftListingQuery";
import { useEditListingQuery } from "./useEditListingQuery";
import { useGetListingQuery } from "./useGetListingQuery";

// A failed autosave stays on screen this long before the same change is tried again.
const AUTOSAVE_RETRY_DELAY_MS = 5000;

export type AutosaveStatus =
  | { status: "saving" }
  | { status: "saved"; savedAt: number }
  | { status: "error"; message: string };

export function useListingForm(initialListingId?: string) {
  const router = useRouter();
  const draftBootstrapPromiseRef = useRef<Promise<string> | null>(null);
  const lastAutosavedPayloadRef =
    useRef<ReturnType<typeof mapListingFormToAutosavePatchInput>>(null);
  const autosaveTimeoutRef = useRef<number | null>(null);
  const inFlightAutosaveRef = useRef<Promise<void> | null>(null);
  const inFlightDraftPreparationsRef = useRef(new Set<Promise<string>>());
  const loadedListingIdRef = useRef<string | undefined>(undefined);
  const [activeListingId, setActiveListingId] = useState(initialListingId);
  const [isAutosaveInFlight, setIsAutosaveInFlight] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);
  // Outcome of the latest autosave in this visit. An error holds back the payload it failed
  // on, so the message can be read; a different payload saves at once, and the same one is
  // tried again after AUTOSAVE_RETRY_DELAY_MS, when heldPayloadKey is cleared.
  const [lastAutosave, setLastAutosave] = useState<
    | { status: "saved"; savedAt: number }
    | { status: "error"; message: string; heldPayloadKey: string | null }
    | null
  >(null);
  const form = useForm<ListingFormInput, ListingFormContext, ListingFormData>({
    resolver: zodResolver(listingFormSchema) as Resolver<
      ListingFormInput,
      ListingFormContext,
      ListingFormData
    >,
    defaultValues: CREATE_FORM_DEFAULTS,
  });
  const watchedValues = useWatch({
    control: form.control,
  }) as ListingFormInput;
  const {
    data: initialData,
    isLoading: isFetching,
    loadError,
  } = useGetListingQuery(initialListingId);
  const { createDraftListing } = useCreateDraftListingQuery();
  const { patchListing, replaceListing } = useEditListingQuery();
  const pendingNullableFieldClearIntent = getPendingAutosaveNullableFieldClearIntent(
    watchedValues,
    lastAutosavedPayloadRef.current,
  );
  const nullableFieldEditIntent = {
    description:
      form.formState.dirtyFields.description === true ||
      form.formState.touchedFields.description === true ||
      pendingNullableFieldClearIntent.description === true,
    street2:
      form.formState.dirtyFields.street2 === true ||
      form.formState.touchedFields.street2 === true ||
      pendingNullableFieldClearIntent.street2 === true,
    squareFeet:
      form.formState.dirtyFields.squareFeet === true ||
      form.formState.touchedFields.squareFeet === true ||
      pendingNullableFieldClearIntent.squareFeet === true,
  };
  const hasPendingNullableFieldClear = Object.values(pendingNullableFieldClearIntent).some(Boolean);
  const autosavePayload = mapListingFormToAutosavePatchInput(
    watchedValues,
    initialListingId ? watchedValues.status : "draft",
    nullableFieldEditIntent,
  );
  const autosavePayloadKey = autosavePayload ? JSON.stringify(autosavePayload) : null;
  const lastAutosavedPayloadKey = lastAutosavedPayloadRef.current
    ? JSON.stringify(lastAutosavedPayloadRef.current)
    : null;
  const isPublishedEditMode = Boolean(initialListingId && initialData?.status === "published");
  const shouldAutosaveDraft =
    !isPublishedEditMode &&
    Boolean(
      autosavePayload &&
      autosavePayloadKey &&
      lastAutosavedPayloadKey !== autosavePayloadKey &&
      !(lastAutosave?.status === "error" && lastAutosave.heldPayloadKey === autosavePayloadKey) &&
      // Before the first autosave, only an edit starts one. After it, the form can match the
      // loaded values again while the server holds a later save, so the payloads alone decide.
      (lastAutosave !== null || form.formState.isDirty || hasPendingNullableFieldClear) &&
      !isAutosaveInFlight &&
      !isPublishing &&
      !form.formState.isSubmitting,
    );
  const autosaveStatus: AutosaveStatus | null =
    shouldAutosaveDraft || isAutosaveInFlight ? { status: "saving" } : lastAutosave;
  const shouldWarnOnNavigateAway =
    isPublishedEditMode && form.formState.isDirty && !form.formState.isSubmitting && !isPublishing;

  const activateDraftListing = useCallback((listingId: string) => {
    setActiveListingId(listingId);
    window.history.replaceState(null, "", `/listing-form/${listingId}`);
  }, []);

  const createDraftListingId = useCallback(async (): Promise<string> => {
    if (activeListingId) {
      return activeListingId;
    }

    if (draftBootstrapPromiseRef.current) {
      return draftBootstrapPromiseRef.current;
    }

    // A created draft is kept even when the save that follows fails, so a retry reuses it
    // instead of creating another. Only a failed creation is forgotten.
    const bootstrapPromise = createDraftListing()
      .then((draftListing) => draftListing.id)
      .catch((error: unknown) => {
        if (draftBootstrapPromiseRef.current === bootstrapPromise) {
          draftBootstrapPromiseRef.current = null;
        }
        throw error;
      });

    draftBootstrapPromiseRef.current = bootstrapPromise;

    return bootstrapPromise;
  }, [activeListingId, createDraftListing]);

  const createAndSaveDraftListing = useCallback(async (): Promise<string> => {
    const listingId = await createDraftListingId();

    if (!form.formState.isDirty && !hasPendingNullableFieldClear) {
      return listingId;
    }

    const currentDraftPayload = mapListingFormToAutosavePatchInput(
      form.getValues(),
      "draft",
      nullableFieldEditIntent,
    );

    if (!currentDraftPayload) {
      return listingId;
    }

    await patchListing({
      listingId,
      payload: currentDraftPayload,
    });
    lastAutosavedPayloadRef.current = currentDraftPayload;

    return listingId;
  }, [
    createDraftListingId,
    form,
    hasPendingNullableFieldClear,
    nullableFieldEditIntent,
    patchListing,
  ]);

  // Image uploads call this too, and more than one can be running. Their draft saves are
  // tracked so that a publish started in the meantime waits for them; a draft save landing
  // after the publish would undo it.
  const prepareDraftListing = useCallback((): Promise<string> => {
    const preparations = inFlightDraftPreparationsRef.current;
    const preparation = createAndSaveDraftListing();
    const forget = () => {
      preparations.delete(preparation);
    };

    preparations.add(preparation);
    preparation.then(forget, forget);

    return preparation;
  }, [createAndSaveDraftListing]);

  useEffect(() => {
    setActiveListingId(initialListingId);
  }, [initialListingId]);

  useEffect(() => {
    if (initialData) {
      if (loadedListingIdRef.current === initialListingId) {
        // A refetch of the listing already in the form (autosave and publish both invalidate
        // the query) only moves the baseline that dirty state compares against. The form stays
        // the source of truth for values, so edits made since the request started, and cleared
        // numbers that autosave leaves out of the patch, are not overwritten. Keeping the
        // submitted state lets errors from a failed publish keep clearing as fields are fixed.
        form.reset(initialData, {
          keepValues: true,
          keepDirty: true,
          keepTouched: true,
          keepErrors: true,
          keepIsSubmitted: true,
          keepSubmitCount: true,
        });
        return;
      }

      loadedListingIdRef.current = initialListingId;
      form.reset(initialData);
      lastAutosavedPayloadRef.current = mapListingFormToAutosavePatchInput(
        initialData,
        initialListingId ? initialData.status : "draft",
      );
      return;
    }

    if (!activeListingId) {
      form.reset(CREATE_FORM_DEFAULTS);
      lastAutosavedPayloadRef.current = null;
    }
  }, [activeListingId, form, initialData, initialListingId]);

  useEffect(() => {
    if (!autosavePayload || !autosavePayloadKey || !shouldAutosaveDraft) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsAutosaveInFlight(true);

      const autosavePromise = Promise.resolve(
        activeListingId
          ? {
              listingId: activeListingId,
              shouldActivateDraft: false,
            }
          : createDraftListingId().then((listingId) => ({
              listingId,
              shouldActivateDraft: true,
            })),
      )
        .then(({ listingId, shouldActivateDraft }) =>
          patchListing({
            listingId,
            payload: autosavePayload,
          }).then(() => {
            if (shouldActivateDraft) {
              activateDraftListing(listingId);
            }
          }),
        )
        .then(() => {
          lastAutosavedPayloadRef.current = autosavePayload;
          setLastAutosave({ status: "saved", savedAt: Date.now() });
        })
        .catch((error) => {
          setLastAutosave({
            status: "error",
            message: error instanceof Error ? error.message : "Unable to save draft.",
            heldPayloadKey: autosavePayloadKey,
          });
        })
        .finally(() => {
          if (inFlightAutosaveRef.current === autosavePromise) {
            inFlightAutosaveRef.current = null;
          }
          setIsAutosaveInFlight(false);
        });

      inFlightAutosaveRef.current = autosavePromise;
    }, 800);

    autosaveTimeoutRef.current = timeout;

    return () => {
      if (autosaveTimeoutRef.current === timeout) {
        autosaveTimeoutRef.current = null;
      }
      window.clearTimeout(timeout);
    };
  }, [
    activeListingId,
    activateDraftListing,
    autosavePayload,
    autosavePayloadKey,
    createDraftListingId,
    patchListing,
    shouldAutosaveDraft,
  ]);

  useEffect(() => {
    if (lastAutosave?.status !== "error" || lastAutosave.heldPayloadKey === null) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setLastAutosave((current) =>
        current?.status === "error" ? { ...current, heldPayloadKey: null } : current,
      );
    }, AUTOSAVE_RETRY_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [lastAutosave]);

  useEffect(() => {
    if (!shouldWarnOnNavigateAway) {
      return;
    }

    const warningMessage =
      "You have unsaved changes to this published listing. Leave this page without saving?";

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = warningMessage;
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const link = target.closest("a[href]");

      if (!(link instanceof HTMLAnchorElement)) {
        return;
      }

      if (link.target === "_blank" || link.hasAttribute("download")) {
        return;
      }

      const nextUrl = new URL(link.href, window.location.href);

      if (nextUrl.href === window.location.href) {
        return;
      }

      if (!window.confirm(warningMessage)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [shouldWarnOnNavigateAway]);

  const onSubmit = async (data: ListingFormData) => {
    setSubmitFeedback(null);
    setIsPublishing(true);
    let createdDraftListingId: string | null = null;

    try {
      if (autosaveTimeoutRef.current !== null) {
        window.clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }

      if (inFlightAutosaveRef.current) {
        await inFlightAutosaveRef.current;
      }

      // A failure here belongs to the upload that started it; the publish carries on. Another
      // upload can start during the wait, so check again until none is left.
      while (inFlightDraftPreparationsRef.current.size > 0) {
        await Promise.allSettled(inFlightDraftPreparationsRef.current);
      }

      // Cleared after waiting, since an autosave sets it when it finishes.
      setLastAutosave(null);

      let listingId = activeListingId;

      if (!listingId) {
        listingId = await prepareDraftListing();
        createdDraftListingId = listingId;
      }

      await replaceListing({
        listingId,
        payload: mapListingFormToReplaceListingInput(data, "published"),
      });
      // isPublishing stays true: this form stays mounted until the listing page renders, and
      // an autosave in that gap would save the listing as a draft again.
      router.push(`/listings/${listingId}`);
      router.refresh();
    } catch (error) {
      if (createdDraftListingId) {
        activateDraftListing(createdDraftListingId);
      }
      setSubmitFeedback({
        status: "error",
        message:
          error instanceof Error ? error.message : "Unable to save listing. Please try again.",
      });
      setIsPublishing(false);
    }
  };

  return {
    form,
    onSubmit,
    activateDraftListing,
    prepareDraftListing,
    listingId: activeListingId,
    autosaveStatus,
    isLoading: isFetching,
    loadError,
    // Only the person's own submit. Autosave requests leave the button usable: onSubmit waits
    // for a save that is in flight before it publishes.
    isSubmitting: isPublishing || form.formState.isSubmitting,
    submitFeedback,
  };
}
