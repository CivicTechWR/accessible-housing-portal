import { z } from "zod";

import { optionalTrimmedStringToUndefined, requiredTrimmedString } from "./string-normalizers";

export const customListingFieldTypeSchema = z.enum([
  "boolean",
  "number",
  "text",
  "select",
  "multi_select",
  "date",
]);
export const customListingFieldApplicabilitySchema = z.enum(["building", "unit"]);

const nonEmptyString = requiredTrimmedString();
const customListingFieldIdSchema = z.uuid("Invalid custom listing field id.");
export const customListingFieldSelectableOptionSchema = z.object({
  label: nonEmptyString,
  value: nonEmptyString,
});

export const customListingFieldQuerySchema = z.object({
  publicOnly: z.enum(["true", "false"]).optional(),
  filterableOnly: z.enum(["true", "false"]).optional(),
  category: optionalTrimmedStringToUndefined(),
  groupId: optionalTrimmedStringToUndefined(),
  type: customListingFieldTypeSchema.optional(),
});

export const adminCustomListingFieldQuerySchema = z.object({
  category: optionalTrimmedStringToUndefined(),
  type: customListingFieldTypeSchema.optional(),
  publicOnly: z.enum(["true", "false"]).optional(),
  filterableOnly: z.enum(["true", "false"]).optional(),
});

export const customListingFieldDefinitionSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: customListingFieldTypeSchema,
  description: z.string().optional(),
  helpText: z.string().optional(),
  placeholder: z.string().optional(),
  selectableOptions: z.array(customListingFieldSelectableOptionSchema).optional(),
});

export const customListingFieldGroupSchema = z.object({
  groupId: z.string(),
  groupLabel: z.string(),
  options: z.array(customListingFieldDefinitionSchema),
});

export const customListingFieldListResponseSchema = z.object({
  data: z.array(customListingFieldGroupSchema),
});

export const adminCustomListingFieldSchema = z.object({
  id: customListingFieldIdSchema,
  key: nonEmptyString,
  label: nonEmptyString,
  description: z.string().trim().optional().nullable(),
  type: customListingFieldTypeSchema,
  category: nonEmptyString,
  appliesTo: customListingFieldApplicabilitySchema,
  helpText: z.string().trim().optional().nullable(),
  placeholder: z.string().trim().optional().nullable(),
  publicOnly: z.boolean(),
  filterableOnly: z.boolean(),
  required: z.boolean(),
  sortOrder: z.number().int().min(0),
  options: z.array(customListingFieldSelectableOptionSchema).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const adminCustomListingFieldListResponseSchema = z.object({
  data: z.array(adminCustomListingFieldSchema),
});

export const customListingFieldParamsSchema = z.object({
  id: customListingFieldIdSchema,
});

const customListingFieldMutationSchema = z.object({
  key: nonEmptyString,
  label: nonEmptyString,
  description: z.string().trim().nullable().optional(),
  type: customListingFieldTypeSchema,
  category: nonEmptyString,
  appliesTo: customListingFieldApplicabilitySchema,
  helpText: z.string().trim().nullable().optional(),
  placeholder: z.string().trim().nullable().optional(),
  publicOnly: z.boolean(),
  filterableOnly: z.boolean(),
  required: z.boolean(),
  sortOrder: z.number().int().min(0),
  options: z.array(customListingFieldSelectableOptionSchema).nullable().optional(),
});

export const createCustomListingFieldSchema = customListingFieldMutationSchema;
export const updateCustomListingFieldSchema = customListingFieldMutationSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const reorderCustomListingFieldsSchema = z.object({
  category: nonEmptyString,
  fields: z
    .array(
      z.object({
        id: customListingFieldIdSchema,
        sortOrder: z.number().int().min(0),
      }),
    )
    .min(1, "At least one field is required."),
});

export const customListingFieldByIdResponseSchema = z.object({
  data: adminCustomListingFieldSchema,
});

export const createCustomListingFieldResponseSchema = z.object({
  message: z.string(),
  data: adminCustomListingFieldSchema,
});

export const updateCustomListingFieldResponseSchema = z.object({
  message: z.string(),
  data: adminCustomListingFieldSchema,
});

export const reorderCustomListingFieldsResponseSchema = z.object({
  message: z.string(),
  data: z.array(adminCustomListingFieldSchema),
});

export const deleteCustomListingFieldResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    id: customListingFieldIdSchema,
  }),
});

export type CustomListingFieldQuery = z.infer<typeof customListingFieldQuerySchema>;
export type CustomListingFieldType = z.infer<typeof customListingFieldTypeSchema>;
export type CustomListingFieldApplicability = z.infer<typeof customListingFieldApplicabilitySchema>;
export type CustomListingFieldSelectableOption = z.infer<
  typeof customListingFieldSelectableOptionSchema
>;
export type CustomListingFieldDefinition = z.infer<typeof customListingFieldDefinitionSchema>;
export type CustomListingFieldGroup = z.infer<typeof customListingFieldGroupSchema>;
export type CustomListingFieldListResponse = z.infer<typeof customListingFieldListResponseSchema>;
export type AdminCustomListingFieldQuery = z.infer<typeof adminCustomListingFieldQuerySchema>;
export type AdminCustomListingField = z.infer<typeof adminCustomListingFieldSchema>;
export type AdminCustomListingFieldListResponse = z.infer<
  typeof adminCustomListingFieldListResponseSchema
>;
export type CustomListingFieldParams = z.infer<typeof customListingFieldParamsSchema>;
export type CreateCustomListingFieldInput = z.infer<typeof createCustomListingFieldSchema>;
export type UpdateCustomListingFieldInput = z.infer<typeof updateCustomListingFieldSchema>;
export type ReorderCustomListingFieldsInput = z.infer<typeof reorderCustomListingFieldsSchema>;
export type CustomListingFieldByIdResponse = z.infer<typeof customListingFieldByIdResponseSchema>;
export type CreateCustomListingFieldResponse = z.infer<
  typeof createCustomListingFieldResponseSchema
>;
export type UpdateCustomListingFieldResponse = z.infer<
  typeof updateCustomListingFieldResponseSchema
>;
export type ReorderCustomListingFieldsResponse = z.infer<
  typeof reorderCustomListingFieldsResponseSchema
>;
export type DeleteCustomListingFieldResponse = z.infer<
  typeof deleteCustomListingFieldResponseSchema
>;
