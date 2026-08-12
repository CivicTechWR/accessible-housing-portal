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
  appliesTo: z.enum(["", "building", "unit"]).refine((value) => value !== "", {
    message: "Applicability is required.",
  }),
  helpText: z.string(),
  publicOnly: z.boolean(),
  filterableOnly: z.boolean(),
  required: z.boolean(),
});

export type CreateFieldDialogInput = z.input<typeof createFieldDialogSchema>;
export type CreateFieldDialogValues = z.output<typeof createFieldDialogSchema>;

export function getDefaultCreateFieldDialogValues(state: FieldDialogState): CreateFieldDialogInput {
  return {
    key: "",
    label: "",
    description: "",
    category: state.category,
    appliesTo: "",
    helpText: "",
    publicOnly: true,
    filterableOnly: true,
    required: false,
  };
}

export function toCreateFieldDialogPayload(
  values: CreateFieldDialogInput,
  categories: string[],
): CreateFieldDialogPayload {
  if (values.appliesTo === "") {
    throw new Error("Applicability is required.");
  }

  return {
    key: values.key,
    label: values.label,
    description: nullableTrim(values.description),
    type: "boolean",
    category: getCanonicalCategoryValue(values.category, categories),
    appliesTo: values.appliesTo,
    helpText: nullableTrim(values.helpText),
    publicOnly: values.publicOnly,
    filterableOnly: values.filterableOnly,
    required: values.required,
    options: null,
  };
}

export const bulkEditDialogSchema = z
  .object({
    categoryEnabled: z.boolean(),
    category: z.string(),
    applicabilityEnabled: z.boolean(),
    appliesTo: z.enum(["building", "unit"]),
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
      !values.applicabilityEnabled &&
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
    applicabilityEnabled: false,
    appliesTo: "building",
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

  if (values.applicabilityEnabled) {
    payload.appliesTo = values.appliesTo;
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
