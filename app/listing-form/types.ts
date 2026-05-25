import { z } from "zod";
import type { Control, UseFormReturn } from "react-hook-form";
import {
  optionalTrimmedStringToUndefined,
  requiredTrimmedString,
  trimmedAbsoluteOrRootRelativeUrlString,
} from "@/shared/schemas/string-normalizers";
import { LISTING_BUILDING_TYPE_VALUES, UTILITY_INCLUDED_VALUES } from "@/shared/schemas/listings";

export const LEASE_TERM_MONTH_VALUES = ["1", "6", "12", "24"] as const;

const requiredSelectValue = <TValue extends string>(values: readonly TValue[], message: string) =>
  z
    .string()
    .trim()
    .refine((value): value is TValue => values.includes(value as TValue), message);

export const listingImageSchema = z.object({
  id: z.uuid("Invalid uploaded image id").optional(),
  url: trimmedAbsoluteOrRootRelativeUrlString("Image URL is invalid"),
  caption: z.string().trim(),
});

export const listingCustomFeatureSchema = z.object({
  category: requiredTrimmedString("Feature category is required"),
  id: requiredTrimmedString("Feature id is required"),
  name: requiredTrimmedString("Feature name is required"),
  description: requiredTrimmedString("Feature description is required"),
});

const applicationUrlSchema = z.string().trim().pipe(z.httpUrl());

export const listingFormSchema = z.object({
  title: requiredTrimmedString("Title is required"),
  description: optionalTrimmedStringToUndefined(),
  buildingType: requiredSelectValue(LISTING_BUILDING_TYPE_VALUES, "Building type is required"),
  bedrooms: z.number({ message: "Bedrooms are required" }).min(0, "Invalid number of bedrooms"),
  bathrooms: z.number({ message: "Bathrooms are required" }).min(0, "Invalid number of bathrooms"),
  squareFeet: z.number().optional(),
  monthlyRentCents: z.number({ message: "Rent is required" }).min(0, "Rent cannot be negative"),
  leaseTerm: requiredSelectValue(LEASE_TERM_MONTH_VALUES, "Lease term is required"),
  utilitiesIncluded: z.array(z.enum(UTILITY_INCLUDED_VALUES)).default([]),
  images: z.array(listingImageSchema).default([]),
  availableOn: optionalTrimmedStringToUndefined(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  unitNumber: optionalTrimmedStringToUndefined(),

  // Property Info
  name: requiredTrimmedString("Property name is required"),
  street1: requiredTrimmedString("Street address is required"),
  street2: optionalTrimmedStringToUndefined(),
  city: requiredTrimmedString("City is required"),
  province: requiredTrimmedString("Province is required"),
  postalCode: requiredTrimmedString("Postal code is required"),
  contactName: requiredTrimmedString("Contact name is required"),
  contactEmail: requiredTrimmedString("Contact email is required")
    .toLowerCase()
    .pipe(z.email("Invalid email")),
  contactPhone: requiredTrimmedString("Contact phone is required"),
  applicationUrl: z
    .string()
    .trim()
    .transform((value) => (value === "" ? undefined : value))
    .pipe(applicationUrlSchema.optional())
    .optional(),

  // Selected custom features (includes display data for preview/UI rendering)
  customFeatures: z.array(listingCustomFeatureSchema).default([]),
});

export type ListingFormInput = z.input<typeof listingFormSchema>;
export type ListingFormData = z.output<typeof listingFormSchema>;
export type ListingFormImage = z.output<typeof listingImageSchema>;
export type ListingFormContext = Record<string, never>;
export type ListingFormControl = Control<ListingFormInput, ListingFormContext, ListingFormData>;
export type ListingFormMethods = UseFormReturn<
  ListingFormInput,
  ListingFormContext,
  ListingFormData
>;

export const CREATE_FORM_DEFAULTS: Omit<ListingFormInput, "monthlyRentCents"> = {
  title: "",
  description: "",
  buildingType: "",
  bedrooms: 0,
  bathrooms: 0,
  squareFeet: undefined,
  leaseTerm: "",
  utilitiesIncluded: [],
  images: [],
  availableOn: undefined,
  status: "draft",
  unitNumber: undefined,
  name: "",
  street1: "",
  street2: "",
  city: "",
  province: "",
  postalCode: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  applicationUrl: undefined,
  customFeatures: [],
};
