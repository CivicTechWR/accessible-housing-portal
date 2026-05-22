import { z } from "zod";
import {
  optionalTrimmedString,
  requiredTrimmedString,
  trimmedEmailString,
  trimmedUrlString,
} from "@/shared/schemas/string-normalizers";
import { positiveIntegerQueryParamSchema, positiveIntegerQueryParamWithMaxSchema } from "./common";

const nonEmptyString = requiredTrimmedString();
const listingStatusSchema = z.enum(["draft", "published", "archived"]);
const hasAtLeastOneField = (value: Record<string, unknown>) => Object.keys(value).length > 0;

export const listingIdParamSchema = z.uuid("Invalid listing id.");
export const listingParamsSchema = z.object({
  id: listingIdParamSchema,
});

export const listingQuerySchema = z.object({
  page: positiveIntegerQueryParamSchema.optional(),
  limit: positiveIntegerQueryParamWithMaxSchema(100).optional(),
  status: listingStatusSchema.optional(),
  neighborhood: optionalTrimmedString(),
  bedrooms: z
    .string()
    .regex(/^\d+\+?$/)
    .optional(),
  bathrooms: z
    .string()
    .regex(/^\d+\+?$/)
    .optional(),
  location: optionalTrimmedString(),
  minPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),
  maxPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),
  maxRent: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),
  accessibility: z.enum(["true", "false"]).optional(),
  moveInDate: optionalTrimmedString(),
  sort: z.enum(["newest", "oldest", "price_asc", "price_desc"]).optional(),
  features: z.union([z.string(), z.array(z.string())]).optional(),
  search: optionalTrimmedString(),
});

export const listingFeatureSchema = z.object({
  id: z.string().optional(),
  name: nonEmptyString,
  description: nonEmptyString,
});

const listingEditorFeatureSchema = z.object({
  category: z.string(),
  id: nonEmptyString,
  name: nonEmptyString,
  description: nonEmptyString,
});

export const listingFeatureCategorySchema = z.object({
  categoryName: nonEmptyString,
  features: z.array(listingFeatureSchema),
});

export const listingImageSchema = z.object({
  url: trimmedUrlString("Invalid listing image URL."),
  caption: nonEmptyString,
});

export const listingUploadedImageInputSchema = z.object({
  id: z.uuid("Invalid uploaded image id."),
  caption: optionalTrimmedString(),
});

const listingEditorImageSchema = z.object({
  id: listingIdParamSchema,
  url: z.string(),
  caption: z.string(),
});

const listingImageUrlSchema = trimmedUrlString("Invalid image URL.");
const listingExternalApplicationUrlSchema = z.string().trim().pipe(z.httpUrl());
const listingDetailsAddressSchema = z.object({
  street1: nonEmptyString,
  street2: nonEmptyString.optional(),
  city: nonEmptyString,
  province: nonEmptyString,
  postalCode: nonEmptyString,
});
const listingContactSchema = z.object({
  name: nonEmptyString,
  email: trimmedEmailString("Invalid contact email."),
  phone: nonEmptyString,
});

export const listingDetailsSchema = z.object({
  id: listingIdParamSchema,
  title: nonEmptyString.optional(),
  editUrl: z.string().optional(),
  unitNumber: nonEmptyString.optional(),
  price: z.number().min(0),
  address: listingDetailsAddressSchema,
  beds: z.number().int().min(0),
  baths: z.number().min(0),
  sqft: z.number().int().min(0),
  accessibilityFeatures: z.array(listingFeatureSchema).optional(),
  images: z.array(listingImageSchema),
  timeAgo: nonEmptyString,
  features: z.array(listingFeatureCategorySchema),
  contact: listingContactSchema.optional(),
  applicationUrl: listingExternalApplicationUrlSchema.optional(),
});

export const listingSummarySchema = z.object({
  id: listingIdParamSchema,
  title: nonEmptyString.optional(),
  price: z.number().min(0),
  address: nonEmptyString,
  city: nonEmptyString,
  beds: z.number().int().min(0),
  baths: z.number().min(0),
  sqft: z.number().int().min(0),
  accessibilityFeatures: z.array(listingFeatureSchema).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  imageUrl: listingImageUrlSchema.optional(),
  timeAgo: nonEmptyString,
});

const listingAddressSchema = z.object({
  street: nonEmptyString,
  street2: nonEmptyString.optional(),
  city: nonEmptyString,
  province: nonEmptyString,
  postalCode: nonEmptyString,
  neighborhood: nonEmptyString.optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const listingUnitSchema = z.object({
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().min(0),
  sqft: z.number().int().min(0).optional(),
  rent: z.number().int().min(0),
  availableDate: z.iso.date().optional(),
});

const listingEligibilityCriteriaSchema = z.object({
  maxIncome: z.number().int().min(0).optional(),
  minAge: z.number().int().min(0).optional(),
  housingType: nonEmptyString.optional(),
});

const listingApplicationMethodSchema = z.enum(["internal", "external_link", "paper"]);
const listingPaginationSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});
const listingAddressPatchSchema = listingAddressSchema.partial().refine(hasAtLeastOneField, {
  message: "Address update must include at least one field.",
});
const listingEligibilityCriteriaPatchSchema = listingEligibilityCriteriaSchema
  .partial()
  .refine(hasAtLeastOneField, {
    message: "Eligibility criteria update must include at least one field.",
  });
const listingContactPatchSchema = listingContactSchema.partial().refine(hasAtLeastOneField, {
  message: "Contact update must include at least one field.",
});
const listingUnitPatchSchema = listingUnitSchema.partial().refine(hasAtLeastOneField, {
  message: "Each unit update must include at least one field.",
});

const updateListingBasePayloadSchema = z.object({
  title: nonEmptyString.optional(),
  name: nonEmptyString.optional(),
  description: optionalTrimmedString(),
  address: listingAddressPatchSchema.optional(),
  units: z.array(listingUnitPatchSchema).min(1, "At least one unit is required.").optional(),
  amenities: z.array(nonEmptyString).optional(),
  accessibilityFeatures: z.array(listingFeatureSchema).optional(),
  eligibilityCriteria: listingEligibilityCriteriaPatchSchema.optional(),
  images: z.array(listingUploadedImageInputSchema).optional(),
  contact: listingContactPatchSchema.optional(),
  status: listingStatusSchema.optional(),
  unitNumber: z.union([nonEmptyString, z.null()]).optional(),
  propertyType: nonEmptyString.optional(),
  buildingType: nonEmptyString.optional(),
  unitStory: z.number().optional(),
  leaseTerm: nonEmptyString.optional(),
  utilitiesIncluded: z.array(nonEmptyString).optional(),
});
const updateListingApplicationPayloadSchema = z
  .object({
    applicationMethod: listingApplicationMethodSchema.optional(),
    externalApplicationUrl: listingExternalApplicationUrlSchema.optional(),
  })
  .refine(
    (value) => value.applicationMethod !== "external_link" || !!value.externalApplicationUrl,
    {
      message: "External application URL is required when applicationMethod is external_link.",
      path: ["externalApplicationUrl"],
    },
  );
const updateListingPayloadSchema = updateListingBasePayloadSchema
  .and(updateListingApplicationPayloadSchema)
  .refine((value) => hasAtLeastOneField(value), {
    message: "At least one field is required.",
  });
const listingIdDataSchema = z.object({
  id: listingIdParamSchema,
});

const listingPayloadSchema = z.object({
  title: nonEmptyString,
  name: nonEmptyString,
  description: optionalTrimmedString(),
  address: listingAddressSchema,
  units: z.tuple([listingUnitSchema], listingUnitSchema),
  amenities: z.array(nonEmptyString),
  accessibilityFeatures: z.array(listingFeatureSchema),
  applicationMethod: listingApplicationMethodSchema,
  externalApplicationUrl: listingExternalApplicationUrlSchema.optional(),
  eligibilityCriteria: listingEligibilityCriteriaSchema,
  images: z.array(listingUploadedImageInputSchema),
  contact: listingContactSchema,
  status: listingStatusSchema,
  unitNumber: nonEmptyString.optional(),
  imageUploadSessionId: z.uuid("Invalid image upload session id.").optional(),
  propertyType: nonEmptyString.optional(),
  buildingType: nonEmptyString.optional(),
  unitStory: z.number().optional(),
  leaseTerm: nonEmptyString.optional(),
  utilitiesIncluded: z.array(nonEmptyString).optional(),
});

export const createListingSchema = listingPayloadSchema.superRefine((value, context) => {
  if (value.applicationMethod === "external_link" && !value.externalApplicationUrl) {
    context.addIssue({
      code: "custom",
      message: "External application URL is required when applicationMethod is external_link.",
      path: ["externalApplicationUrl"],
    });
  }
});

export const updateListingSchema = updateListingPayloadSchema;

export const listingEditorDataSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  propertyType: z.string(),
  buildingType: z.string(),
  unitStory: z.number().optional(),
  bedrooms: z.number().min(0),
  bathrooms: z.number().min(0),
  squareFeet: z.number().min(0).optional(),
  monthlyRentCents: z.number().min(0),
  leaseTerm: z.string(),
  utilitiesIncluded: z.array(z.string()),
  images: z.array(listingEditorImageSchema),
  availableOn: z.iso.date().optional(),
  status: listingStatusSchema,
  unitNumber: z.string().optional(),
  name: z.string(),
  street1: z.string(),
  street2: z.string().optional(),
  city: z.string(),
  province: z.string(),
  postalCode: z.string(),
  contactName: z.string(),
  contactEmail: z.string(),
  contactPhone: z.string(),
  applicationUrl: listingExternalApplicationUrlSchema.optional(),
  customFeatures: z.array(listingEditorFeatureSchema),
});

export const listingListResponseSchema = z.object({
  data: z.array(listingSummarySchema),
  pagination: listingPaginationSchema,
});

export const listingByIdResponseSchema = z.object({
  data: listingDetailsSchema,
});

export const listingEditorResponseSchema = z.object({
  data: listingEditorDataSchema.extend({
    id: listingIdParamSchema,
  }),
});

export const createListingResponseSchema = z.object({
  message: z.string(),
  data: listingPayloadSchema.extend({
    id: listingIdParamSchema,
  }),
});

export const createDraftListingResponseSchema = z.object({
  message: z.string(),
  data: listingIdDataSchema,
});

export const updateListingResponseSchema = z.object({
  message: z.string(),
  data: listingIdDataSchema.and(updateListingPayloadSchema),
});

export const deleteListingResponseSchema = z.object({
  message: z.string(),
  data: listingIdDataSchema,
});

export type ListingIdParam = z.infer<typeof listingIdParamSchema>;
export type ListingParams = z.infer<typeof listingParamsSchema>;
export type ListingQuery = z.infer<typeof listingQuerySchema>;
export type ListingDetails = z.infer<typeof listingDetailsSchema>;
export type ListingSummary = z.infer<typeof listingSummarySchema>;
export type ListingListResponse = z.infer<typeof listingListResponseSchema>;
export type ListingByIdResponse = z.infer<typeof listingByIdResponseSchema>;
export type ListingEditorData = z.infer<typeof listingEditorDataSchema>;
export type ListingEditorResponse = z.infer<typeof listingEditorResponseSchema>;
export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type CreateListingResponse = z.infer<typeof createListingResponseSchema>;
export type CreateDraftListingResponse = z.infer<typeof createDraftListingResponseSchema>;
export type UpdateListingResponse = z.infer<typeof updateListingResponseSchema>;
export type DeleteListingResponse = z.infer<typeof deleteListingResponseSchema>;
