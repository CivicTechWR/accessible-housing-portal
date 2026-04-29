"use client";

import { type DragEvent, useEffect, useMemo, useRef, useState } from "react";

import type {
  AdminCustomListingField,
  UpdateCustomListingFieldInput,
} from "@/shared/schemas/custom-listing-fields";
import {
  applyCustomListingFieldUpdates,
  buildCreateCustomListingFieldRequest,
  getReorderedCustomListingFields,
} from "./custom-listing-fields-dashboard-workflow";
import {
  type BulkEditPayload,
  type CreateFieldDialogPayload,
  type DraggingField,
  type DropIndicator,
  type FieldDialogState,
  type SortDirection,
  type SortKey,
  type VisibilityFilter,
  getCategoryStats,
  getDisplayGroups,
  getInsertionIndexForPointer,
  groupFields,
  isFormControlTarget,
  normalizeCategoryPayload,
  normalizeFieldCategories,
  normalizeFieldCategory,
  shouldShowDropIndicator,
  sortFields,
  sortVisibleFields,
} from "./custom-listing-fields-dashboard-utils";
import {
  useAdminCustomListingFieldsQuery,
  useBulkUpdateAdminCustomListingFieldsMutation,
  useCreateAdminCustomListingFieldMutation,
  useDeleteAdminCustomListingFieldMutation,
  useReorderAdminCustomListingFieldsMutation,
  useUpdateAdminCustomListingFieldMutation,
} from "./useAdminCustomListingFieldsApi";

type Feedback = {
  status: "success" | "error";
  message: string;
};

export function useCustomListingFieldsDashboard(initialFields: AdminCustomListingField[]) {
  const [fields, setFields] = useState(() => sortFields(normalizeFieldCategories(initialFields)));
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("category");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => new Set());
  const [pendingFieldId, setPendingFieldId] = useState<string | null>(null);
  const [selectedFieldIds, setSelectedFieldIds] = useState<Set<string>>(() => new Set());
  const [lastSelectedFieldId, setLastSelectedFieldId] = useState<string | null>(null);
  const [draggingField, setDraggingField] = useState<DraggingField | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const [fieldDialog, setFieldDialog] = useState<FieldDialogState | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminCustomListingField | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const rowHandleDragRef = useRef(false);

  const { refreshFields } = useAdminCustomListingFieldsQuery();
  const { createField, isLoading: isCreating } = useCreateAdminCustomListingFieldMutation();
  const { updateField } = useUpdateAdminCustomListingFieldMutation();
  const { updateFields, isLoading: isBulkSaving } = useBulkUpdateAdminCustomListingFieldsMutation();
  const { reorderFields } = useReorderAdminCustomListingFieldsMutation();
  const { deleteField } = useDeleteAdminCustomListingFieldMutation();

  const categories = useMemo(() => getCategoryStats(fields), [fields]);
  const categoryOptions = useMemo(
    () => categories.map((category) => category.category),
    [categories],
  );
  const isFiltered = search.trim() !== "" || categoryFilter !== "all" || visibilityFilter !== "all";

  const filteredFields = useMemo(() => {
    const query = search.trim().toLowerCase();
    const nextFields = fields.filter((field) => {
      const matchesCategory = categoryFilter === "all" || field.category === categoryFilter;
      const matchesVisibility =
        visibilityFilter === "all" ||
        (visibilityFilter === "public" ? field.publicOnly : !field.publicOnly);
      const matchesSearch =
        query === "" ||
        [
          field.label,
          field.key,
          field.category,
          field.description ?? "",
          field.helpText ?? "",
        ].some((value) => value.toLowerCase().includes(query));

      return matchesCategory && matchesVisibility && matchesSearch;
    });

    return sortVisibleFields(nextFields, sortKey, sortDirection);
  }, [categoryFilter, fields, search, sortDirection, sortKey, visibilityFilter]);

  const groupedFields = useMemo(() => groupFields(filteredFields), [filteredFields]);
  const displayGroups = useMemo(
    () =>
      getDisplayGroups({
        activeCategory: categoryFilter,
        expandedCategories,
        groupedFields,
        isFiltered,
      }),
    [categoryFilter, expandedCategories, groupedFields, isFiltered],
  );
  const visibleFieldIds = useMemo(
    () => displayGroups.flatMap((group) => group.visibleFields.map((field) => field.id)),
    [displayGroups],
  );
  const selectedFields = useMemo(
    () => fields.filter((field) => selectedFieldIds.has(field.id)),
    [fields, selectedFieldIds],
  );

  useEffect(() => {
    const handleEscapeSelection = (event: globalThis.KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        selectedFieldIds.size === 0 ||
        fieldDialog ||
        bulkEditOpen ||
        deleteTarget ||
        isFormControlTarget(event.target)
      ) {
        return;
      }

      clearSelection();
    };

    window.addEventListener("keydown", handleEscapeSelection);
    return () => window.removeEventListener("keydown", handleEscapeSelection);
  }, [bulkEditOpen, deleteTarget, fieldDialog, selectedFieldIds.size]);

  const openCreateDialog = (category?: string) => {
    const resolvedCategory =
      category ??
      (categoryFilter !== "all"
        ? categoryFilter
        : (categories[0]?.category ?? "BUILDING AMENITIES"));

    setFieldDialog({
      mode: "create",
      category: resolvedCategory,
    });
  };

  const clearSelection = () => {
    setSelectedFieldIds(new Set());
    setLastSelectedFieldId(null);
  };

  const handleClearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setVisibilityFilter("all");
    setExpandedCategories(new Set());
  };

  const handleSort = (nextSortKey: SortKey) => {
    if (sortKey === nextSortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection("asc");
  };

  const refreshFieldsFromServer = async () => {
    setFields(sortFields(await refreshFields()));
  };

  const handleCreateField = async (payload: CreateFieldDialogPayload) => {
    setFeedback(null);
    const requestPayload = buildCreateCustomListingFieldRequest({ fields, payload });

    const createdField = await createField(requestPayload);
    if (!createdField) {
      return;
    }

    setFields((current) => sortFields([...current, createdField]));
    setCategoryFilter(createdField.category);
    setFieldDialog(null);
    setFeedback({ status: "success", message: "Custom field created." });
  };

  const handleReorderField = async (input: {
    fieldId: string;
    category: string;
    insertionIndex: number;
  }) => {
    const reorderedFields = getReorderedCustomListingFields({ fields, ...input });

    if (!reorderedFields) {
      return;
    }

    const previousFields = fields;
    const optimisticById = new Map(reorderedFields.map((field) => [field.id, field]));

    setSortKey("category");
    setSortDirection("asc");
    setFeedback(null);
    setFields((current) =>
      sortFields(current.map((field) => optimisticById.get(field.id) ?? field)),
    );

    try {
      const updatedFields = await reorderFields({
        category: input.category,
        fields: reorderedFields.map((field) => ({
          id: field.id,
          sortOrder: field.sortOrder,
        })),
      });
      setFields((current) =>
        applyCustomListingFieldUpdates({
          fields: current,
          updatedFields,
        }),
      );
      setFeedback({ status: "success", message: "Custom field order updated." });
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Unable to update custom field order.";

      try {
        await refreshFieldsFromServer();
        setFeedback({
          status: "error",
          message: `${message} Refreshed fields to match the latest saved order.`,
        });
      } catch {
        setFields(previousFields);
        setFeedback({
          status: "error",
          message: `${message} Unable to refresh the latest saved order.`,
        });
      }
    }
  };

  const handleRowHandleClick = (fieldId: string, shiftKey: boolean) => {
    if (rowHandleDragRef.current) {
      rowHandleDragRef.current = false;
      return;
    }

    if (shiftKey && lastSelectedFieldId) {
      const startIndex = visibleFieldIds.indexOf(lastSelectedFieldId);
      const endIndex = visibleFieldIds.indexOf(fieldId);

      if (startIndex >= 0 && endIndex >= 0) {
        const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
        const rangeIds = visibleFieldIds.slice(from, to + 1);

        setSelectedFieldIds((current) => {
          const next = new Set(current);
          for (const id of rangeIds) {
            next.add(id);
          }
          return next;
        });
        return;
      }
    }

    setSelectedFieldIds((current) => {
      const next = new Set(current);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }
      return next;
    });
    setLastSelectedFieldId(fieldId);
  };

  const handleRowDragStart = (
    event: DragEvent<HTMLButtonElement>,
    field: AdminCustomListingField,
    rowElement: HTMLDivElement | null,
  ) => {
    rowHandleDragRef.current = true;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", field.id);
    if (rowElement) {
      const rect = rowElement.getBoundingClientRect();
      event.dataTransfer.setDragImage(
        rowElement,
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
    }
    setSortKey("category");
    setSortDirection("asc");
    setDraggingField({
      fieldId: field.id,
      category: field.category,
    });
  };

  const handleRowDragEnd = () => {
    setDraggingField(null);
    setDropIndicator(null);
    window.setTimeout(() => {
      rowHandleDragRef.current = false;
    }, 0);
  };

  const handleRowDragOver = (
    event: DragEvent<HTMLDivElement>,
    targetField: AdminCustomListingField,
  ) => {
    if (!draggingField || draggingField.category !== targetField.category) {
      setDropIndicator(null);
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const insertionIndex = getInsertionIndexForPointer({
      category: targetField.category,
      fields,
      pointerY: event.clientY,
      rowRect: event.currentTarget.getBoundingClientRect(),
      targetFieldId: targetField.id,
    });

    if (shouldShowDropIndicator({ draggingField, fields, insertionIndex })) {
      setDropIndicator({ category: targetField.category, insertionIndex });
    } else {
      setDropIndicator(null);
    }
  };

  const handleRowDrop = async (
    event: DragEvent<HTMLDivElement>,
    targetField: AdminCustomListingField,
  ) => {
    if (!draggingField || draggingField.category !== targetField.category) {
      return;
    }

    event.preventDefault();
    const insertionIndex = getInsertionIndexForPointer({
      category: targetField.category,
      fields,
      pointerY: event.clientY,
      rowRect: event.currentTarget.getBoundingClientRect(),
      targetFieldId: targetField.id,
    });

    setDropIndicator(null);
    await handleReorderField({
      fieldId: draggingField.fieldId,
      category: targetField.category,
      insertionIndex,
    });
  };

  const handleBulkEdit = async (payload: BulkEditPayload) => {
    if (selectedFields.length === 0 || Object.keys(payload).length === 0) {
      return;
    }

    setFeedback(null);
    const normalizedPayload = normalizeCategoryPayload(payload);

    try {
      const updatedFields = await updateFields(selectedFields, normalizedPayload);
      setFields((current) =>
        applyCustomListingFieldUpdates({
          fields: current,
          updatedFields,
        }),
      );
      setBulkEditOpen(false);
      setFeedback({
        status: "success",
        message: `${updatedFields.length} custom ${updatedFields.length === 1 ? "field" : "fields"} updated.`,
      });
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Unable to update selected fields.";

      try {
        await refreshFieldsFromServer();
        setFeedback({
          status: "error",
          message: `${message} Refreshed fields to match the latest saved values.`,
        });
      } catch {
        setFeedback({
          status: "error",
          message: `${message} Unable to refresh the latest saved values.`,
        });
      }
    }
  };

  const handleUpdateField = async (
    fieldId: string,
    payload: UpdateCustomListingFieldInput,
    closeDialog = true,
    throwOnError = closeDialog,
  ) => {
    setFeedback(null);
    setPendingFieldId(fieldId);
    const normalizedPayload = normalizeCategoryPayload(payload);

    try {
      const updatedField = normalizeFieldCategory(await updateField(fieldId, normalizedPayload));
      setFields((current) =>
        sortFields(current.map((field) => (field.id === fieldId ? updatedField : field))),
      );
      if (closeDialog) {
        setFieldDialog(null);
        setFeedback({ status: "success", message: "Custom field updated." });
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to update custom field.";
      if (closeDialog) {
        throw caught;
      }
      setFeedback({ status: "error", message });
      if (throwOnError) {
        throw caught;
      }
    } finally {
      setPendingFieldId(null);
    }
  };

  const handleDeleteField = async () => {
    if (!deleteTarget) {
      return;
    }

    setFeedback(null);
    setPendingFieldId(deleteTarget.id);

    try {
      await deleteField(deleteTarget.id);
      setFields((current) => current.filter((field) => field.id !== deleteTarget.id));
      setDeleteTarget(null);
      setFeedback({ status: "success", message: "Custom field deleted." });
    } catch (caught) {
      setFeedback({
        status: "error",
        message: caught instanceof Error ? caught.message : "Unable to delete custom field.",
      });
    } finally {
      setPendingFieldId(null);
    }
  };

  return {
    feedback,
    fieldDialog,
    bulkEditOpen,
    deleteTarget,
    categoryOptions,
    isCreating,
    isBulkSaving,
    pendingFieldId,
    selectedFieldCount: selectedFields.length,
    openCreateDialog,
    closeFieldDialog: () => setFieldDialog(null),
    closeBulkEditDialog: () => setBulkEditOpen(false),
    closeDeleteDialog: () => setDeleteTarget(null),
    handleCreateField,
    handleBulkEdit,
    handleDeleteField,
    tableProps: {
      categories,
      categoryOptions,
      categoryFilter,
      visibilityFilter,
      search,
      sortKey,
      sortDirection,
      selectedFieldIds,
      selectedFieldCount: selectedFields.length,
      displayGroups,
      dropIndicator,
      pendingFieldId,
      onSearchChange: setSearch,
      onCategoryFilterChange: setCategoryFilter,
      onVisibilityFilterChange: setVisibilityFilter,
      onClearFilters: handleClearFilters,
      onClearSelection: clearSelection,
      onOpenBulkEdit: () => setBulkEditOpen(true),
      onSort: handleSort,
      onExpandCategory: (category: string) =>
        setExpandedCategories((current) => {
          const next = new Set(current);
          next.add(category);
          return next;
        }),
      onRowSelectToggle: handleRowHandleClick,
      onRowDragStart: handleRowDragStart,
      onRowDragEnd: handleRowDragEnd,
      onRowDragOver: handleRowDragOver,
      onRowDrop: (event: DragEvent<HTMLDivElement>, field: AdminCustomListingField) =>
        void handleRowDrop(event, field),
      onDeleteField: setDeleteTarget,
      onTextChange: (fieldId: string, payload: UpdateCustomListingFieldInput) =>
        handleUpdateField(fieldId, payload, false, true),
      onVisibilityChange: (fieldId: string, publicOnly: boolean) =>
        void handleUpdateField(fieldId, { publicOnly }, false),
      onFilterableChange: (fieldId: string, filterableOnly: boolean) =>
        void handleUpdateField(fieldId, { filterableOnly }, false),
      onRequiredChange: (fieldId: string, required: boolean) =>
        void handleUpdateField(fieldId, { required }, false),
    },
  };
}
