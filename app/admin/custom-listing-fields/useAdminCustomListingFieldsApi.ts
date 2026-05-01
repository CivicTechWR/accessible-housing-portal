"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/app/query-keys";
import type {
  AdminCustomListingField,
  AdminCustomListingFieldListResponse,
  CreateCustomListingFieldInput,
  CreateCustomListingFieldResponse,
  DeleteCustomListingFieldResponse,
  ReorderCustomListingFieldsInput,
  ReorderCustomListingFieldsResponse,
  UpdateCustomListingFieldInput,
  UpdateCustomListingFieldResponse,
} from "@/shared/schemas/custom-listing-fields";
import {
  normalizeFieldCategories,
  normalizeFieldCategory,
} from "./custom-listing-fields-dashboard-utils";

type RequestErrorBody = {
  message?: string;
};

export function useAdminCustomListingFieldsQuery() {
  const queryClient = useQueryClient();

  return {
    refreshFields: () =>
      queryClient.fetchQuery({
        queryKey: queryKeys.adminCustomListingFields(),
        queryFn: fetchAdminCustomListingFields,
        staleTime: 0,
      }),
  };
}

export function useCreateAdminCustomListingFieldMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: CreateCustomListingFieldInput) => {
      const response = await requestJson<CreateCustomListingFieldResponse>(
        "/api/admin/custom-listing-fields",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      return normalizeFieldCategory(response.data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminCustomListingFields() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.accessibilityFeatures() });
    },
  });

  return { createField: mutation.mutateAsync, isLoading: mutation.isPending };
}

export function useUpdateAdminCustomListingFieldMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({
      fieldId,
      input,
    }: {
      fieldId: string;
      input: UpdateCustomListingFieldInput;
    }) => {
      const response = await requestJson<UpdateCustomListingFieldResponse>(
        `/api/admin/custom-listing-fields/${fieldId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      return normalizeFieldCategory(response.data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminCustomListingFields() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.accessibilityFeatures() });
    },
  });

  return {
    updateField: (fieldId: string, input: UpdateCustomListingFieldInput) =>
      mutation.mutateAsync({ fieldId, input }),
  };
}

export function useBulkUpdateAdminCustomListingFieldsMutation() {
  const { updateField } = useUpdateAdminCustomListingFieldMutation();
  const mutation = useMutation({
    mutationFn: async ({
      fields,
      input,
    }: {
      fields: AdminCustomListingField[];
      input: UpdateCustomListingFieldInput;
    }) => Promise.all(fields.map((field) => updateField(field.id, input))),
  });

  return {
    updateFields: (fields: AdminCustomListingField[], input: UpdateCustomListingFieldInput) =>
      mutation.mutateAsync({ fields, input }),
    isLoading: mutation.isPending,
  };
}

export function useReorderAdminCustomListingFieldsMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: ReorderCustomListingFieldsInput) => {
      const response = await requestJson<ReorderCustomListingFieldsResponse>(
        "/api/admin/custom-listing-fields/reorder",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      return normalizeFieldCategories(response.data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminCustomListingFields() });
    },
  });

  return { reorderFields: mutation.mutateAsync };
}

export function useDeleteAdminCustomListingFieldMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (fieldId: string) => {
      await requestJson<DeleteCustomListingFieldResponse>(
        `/api/admin/custom-listing-fields/${fieldId}`,
        { method: "DELETE" },
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminCustomListingFields() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.accessibilityFeatures() });
    },
  });

  return { deleteField: mutation.mutateAsync };
}

async function fetchAdminCustomListingFields() {
  const response = await requestJson<AdminCustomListingFieldListResponse>(
    "/api/admin/custom-listing-fields",
    { method: "GET" },
  );
  return normalizeFieldCategories(response.data);
}

async function requestJson<T = unknown>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => ({}))) as RequestErrorBody;

  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed.");
  }

  return payload as T;
}
