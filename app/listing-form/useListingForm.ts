import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { mapListingFormToAutosaveUpdateInput, mapListingFormToUpdateListingInput } from "./api";
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

export function useListingForm(initialListingId?: string) {
  const router = useRouter();
  const draftBootstrapPromiseRef = useRef<Promise<string> | null>(null);
  const lastAutosavedPayloadRef = useRef<string | null>(null);
  const autosaveTimeoutRef = useRef<number | null>(null);
  const inFlightAutosaveRef = useRef<Promise<void> | null>(null);
  const [activeListingId, setActiveListingId] = useState(initialListingId);
  const [isAutosaveInFlight, setIsAutosaveInFlight] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);
  const [autosaveFeedback, setAutosaveFeedback] = useState<string | null>(null);
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
    isError: isFetchError,
  } = useGetListingQuery(initialListingId);
  const { createDraftListing, isLoading: isCreatingDraft } = useCreateDraftListingQuery();
  const { editListing, isLoading: isEditing } = useEditListingQuery();
  const autosavePayload = mapListingFormToAutosaveUpdateInput(
    watchedValues,
    initialListingId ? watchedValues.status : "draft",
  );
  const autosavePayloadKey = autosavePayload ? JSON.stringify(autosavePayload) : null;
  const isPublishedEditMode = Boolean(initialListingId && initialData?.status === "published");
  const shouldAutosaveDraft =
    !isPublishedEditMode &&
    Boolean(
      autosavePayload &&
      autosavePayloadKey &&
      lastAutosavedPayloadRef.current !== autosavePayloadKey &&
      form.formState.isDirty &&
      !isAutosaveInFlight &&
      !isPublishing &&
      !form.formState.isSubmitting,
    );
  const shouldWarnOnNavigateAway =
    isPublishedEditMode && form.formState.isDirty && !form.formState.isSubmitting;

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

    const bootstrapPromise = createDraftListing()
      .then((draftListing) => draftListing.id)
      .finally(() => {
        if (draftBootstrapPromiseRef.current === bootstrapPromise) {
          draftBootstrapPromiseRef.current = null;
        }
      });

    draftBootstrapPromiseRef.current = bootstrapPromise;

    return bootstrapPromise;
  }, [activeListingId, createDraftListing]);

  const prepareDraftListing = useCallback(async (): Promise<string> => {
    const listingId = await createDraftListingId();

    if (!form.formState.isDirty) {
      return listingId;
    }

    const currentDraftPayload = mapListingFormToAutosaveUpdateInput(form.getValues(), "draft");

    if (!currentDraftPayload) {
      return listingId;
    }

    await editListing({
      listingId,
      payload: currentDraftPayload,
    });
    lastAutosavedPayloadRef.current = JSON.stringify(currentDraftPayload);

    return listingId;
  }, [createDraftListingId, editListing, form]);

  useEffect(() => {
    setActiveListingId(initialListingId);
  }, [initialListingId]);

  useEffect(() => {
    if (initialData) {
      if (!form.formState.isDirty || initialListingId) {
        form.reset(initialData);
        lastAutosavedPayloadRef.current = JSON.stringify(
          mapListingFormToAutosaveUpdateInput(
            initialData,
            initialListingId ? initialData.status : "draft",
          ),
        );
      }
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
      setAutosaveFeedback("Saving draft...");

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
          editListing({
            listingId,
            payload: autosavePayload,
          }).then(() => {
            if (shouldActivateDraft) {
              activateDraftListing(listingId);
            }
          }),
        )
        .then(() => {
          lastAutosavedPayloadRef.current = autosavePayloadKey;
          setAutosaveFeedback("Draft saved");
        })
        .catch((error) => {
          setAutosaveFeedback(error instanceof Error ? error.message : "Unable to autosave draft");
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
    editListing,
    shouldAutosaveDraft,
  ]);

  useEffect(() => {
    if (shouldAutosaveDraft || isAutosaveInFlight) {
      return;
    }

    setAutosaveFeedback(null);
  }, [isAutosaveInFlight, shouldAutosaveDraft]);

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
    setAutosaveFeedback(null);
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

      let listingId = activeListingId;

      if (!listingId) {
        listingId = await prepareDraftListing();
        createdDraftListingId = listingId;
      }

      await editListing({
        listingId,
        payload: mapListingFormToUpdateListingInput(data, "published", watchedValues),
      });
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
    } finally {
      setIsPublishing(false);
    }
  };

  return {
    form,
    onSubmit,
    activateDraftListing,
    prepareDraftListing,
    listingId: activeListingId,
    autosaveFeedback,
    isLoading: isFetching,
    isError: isFetchError,
    isSubmitting: isCreatingDraft || isEditing || isPublishing || form.formState.isSubmitting,
    submitFeedback,
  };
}
