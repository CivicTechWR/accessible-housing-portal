import { z } from "zod";

import type {
  BulkEditPayload,
  CreateFieldDialogPayload,
  FieldDialogState,
} from "./custom-listing-fields-dashboard-utils";
import { getCanonicalCategoryValue, nullableTrim } from "./custom-listing-fields-dashboard-utils";

const customFieldKeySchema = z
  .string()
  .trim()
  .min(1, "Key is required.")
  .regex(/^[a-z0-9_-]+$/, "Use lowercase letters, numbers, underscores, or hyphens.");

export const createFieldDialogSchema = z.object({
  key: customFieldKeySchema,
  label: z.string().trim().min(1, "Label is required."),
  description: z.string(),
  category: z.string().trim().min(1, "Category is required."),
  helpText: z.string(),
  publicOnly: z.boolean(),
  filterableOnly: z.boolean(),
  required: z.boolean(),
});

export type CreateFieldDialogValues = z.infer<typeof createFieldDialogSchema>;

export function getDefaultCreateFieldDialogValues(
  state: FieldDialogState,
): CreateFieldDialogValues {
  return {
    key: "",
    label: "",
    description: "",
    category: state.category,
    helpText: "",
    publicOnly: true,
    filterableOnly: true,
    required: false,
  };
}

export function toCreateFieldDialogPayload(
  values: CreateFieldDialogValues,
  categories: string[],
): CreateFieldDialogPayload {
  return {
    key: values.key,
    label: values.label,
    description: nullableTrim(values.description),
    type: "boolean",
    category: getCanonicalCategoryValue(values.category, categories),
    helpText: nullableTrim(values.helpText),
    publicOnly: values.publicOnly,
    filterableOnly: values.filterableOnly,
    required: values.required,
  };
}

export const bulkEditDialogSchema = z
  .object({
    categoryEnabled: z.boolean(),
    category: z.string(),
    visibilityEnabled: z.boolean(),
    visibility: z.enum(["public", "internal"]),
    filterableEnabled: z.boolean(),
    filterableOnly: z.boolean(),
    requiredEnabled: z.boolean(),
    required: z.boolean(),
  })
  .superRefine((values, context) => {
    if (
      !values.categoryEnabled &&
      !values.visibilityEnabled &&
      !values.filterableEnabled &&
      !values.requiredEnabled
    ) {
      context.addIssue({
        code: "custom",
        path: ["root"],
        message: "Choose at least one bulk edit.",
      });
    }

    if (values.categoryEnabled && values.category.trim() === "") {
      context.addIssue({
        code: "custom",
        path: ["category"],
        message: "Category is required.",
      });
    }
  });

export type BulkEditDialogValues = z.infer<typeof bulkEditDialogSchema>;

export function getDefaultBulkEditDialogValues(categories: string[]): BulkEditDialogValues {
  return {
    categoryEnabled: false,
    category: categories[0] ?? "",
    visibilityEnabled: false,
    visibility: "public",
    filterableEnabled: false,
    filterableOnly: true,
    requiredEnabled: false,
    required: false,
  };
}

export function toBulkEditPayload(
  values: BulkEditDialogValues,
  categories: string[],
): BulkEditPayload {
  const payload: BulkEditPayload = {};

  if (values.categoryEnabled) {
    payload.category = getCanonicalCategoryValue(values.category, categories);
  }

  if (values.visibilityEnabled) {
    payload.publicOnly = values.visibility === "public";
  }

  if (values.filterableEnabled) {
    payload.filterableOnly = values.filterableOnly;
  }

  if (values.requiredEnabled) {
    payload.required = values.required;
  }

  return payload;
}
