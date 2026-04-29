import type {
  AdminCustomListingField,
  CreateCustomListingFieldInput,
} from "@/shared/schemas/custom-listing-fields";
import type { CreateFieldDialogPayload } from "./custom-listing-fields-dashboard-utils";
import {
  moveItemToInsertionIndex,
  nextSortOrder,
  normalizeCategoryPayload,
  sortCategoryFields,
  sortFields,
} from "./custom-listing-fields-dashboard-utils";

export function buildCreateCustomListingFieldRequest(input: {
  fields: AdminCustomListingField[];
  payload: CreateFieldDialogPayload;
}): CreateCustomListingFieldInput {
  const normalizedPayload = normalizeCategoryPayload(input.payload);

  return {
    ...normalizedPayload,
    placeholder: null,
    sortOrder: nextSortOrder(input.fields, normalizedPayload.category),
  };
}

export function applyCustomListingFieldUpdates(input: {
  fields: AdminCustomListingField[];
  updatedFields: AdminCustomListingField[];
}) {
  const updatedById = new Map(input.updatedFields.map((field) => [field.id, field]));
  return sortFields(input.fields.map((field) => updatedById.get(field.id) ?? field));
}

export function getReorderedCustomListingFields(input: {
  fields: AdminCustomListingField[];
  fieldId: string;
  category: string;
  insertionIndex: number;
}) {
  const categoryFields = sortCategoryFields(
    input.fields.filter((field) => field.category === input.category),
  );
  const draggedIndex = categoryFields.findIndex((field) => field.id === input.fieldId);

  if (
    draggedIndex < 0 ||
    input.insertionIndex === draggedIndex ||
    input.insertionIndex === draggedIndex + 1
  ) {
    return null;
  }

  return moveItemToInsertionIndex(categoryFields, draggedIndex, input.insertionIndex).map(
    (field, index) => ({
      ...field,
      sortOrder: index + 1,
    }),
  );
}
