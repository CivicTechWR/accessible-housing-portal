import { LISTING_BUILDING_TYPE_VALUES } from "@/shared/schemas/listings";
import { LEASE_TERM_MONTH_VALUES, type ListingFormInput } from "./types";

export type CoreFieldType = "text" | "number" | "select" | "textarea" | "email" | "tel" | "url";

export interface FieldOption {
  label: string;
  value: string;
}

type KeysMatching<T, V> = {
  [K in keyof T]-?: T[K] extends V ? K : never;
}[keyof T];

type ListingStringKey = Extract<KeysMatching<ListingFormInput, string | undefined>, string>;
type ListingNumberKey = Extract<KeysMatching<ListingFormInput, number | undefined>, string>;

interface BaseCoreFieldDefinition {
  displayName: string;
  category: string;
  helpText?: string;
  placeholder?: string;
  isRequired: boolean;
  sortOrder: number;
  colSpan?: 1 | 2;
}

interface TextLikeFieldDefinition extends BaseCoreFieldDefinition {
  key: ListingStringKey;
  fieldType: "text" | "textarea" | "email" | "tel" | "url";
  options?: never;
}

interface SelectFieldDefinition extends BaseCoreFieldDefinition {
  key: ListingStringKey;
  fieldType: "select";
  options: FieldOption[];
}

interface NumberFieldDefinition extends BaseCoreFieldDefinition {
  key: ListingNumberKey;
  fieldType: "number";
  options?: never;
}

export type CoreFieldDefinition =
  | TextLikeFieldDefinition
  | SelectFieldDefinition
  | NumberFieldDefinition;

export const CORE_FIELD_CATEGORIES = [
  {
    key: "listing_details",
    displayName: "Listing Details",
    description: "Core information about the listing.",
  },
  {
    key: "property_info",
    displayName: "Property & Contact Info",
    description: "Location and owner details for this building/property.",
  },
] as const;

export const CORE_FIELD_DEFINITIONS: CoreFieldDefinition[] = [
  {
    key: "title",
    displayName: "Title",
    fieldType: "text",
    category: "listing_details",
    isRequired: true,
    sortOrder: 1,
    placeholder: "E.g. Sunny 2BR Apartment",
  },
  {
    key: "description",
    displayName: "Description",
    fieldType: "textarea",
    category: "listing_details",
    isRequired: false,
    sortOrder: 2,
    placeholder: "Short description of the unit and building...",
    colSpan: 2,
  },
  {
    key: "buildingType",
    displayName: "Building Type",
    fieldType: "select",
    category: "listing_details",
    isRequired: true,
    sortOrder: 3,
    options: [
      { label: "Apartment", value: LISTING_BUILDING_TYPE_VALUES[0] },
      { label: "House", value: LISTING_BUILDING_TYPE_VALUES[1] },
      { label: "Townhouse", value: LISTING_BUILDING_TYPE_VALUES[2] },
      { label: "Condo", value: LISTING_BUILDING_TYPE_VALUES[3] },
    ],
  },
  {
    key: "unitNumber",
    displayName: "Unit Number",
    fieldType: "text",
    category: "listing_details",
    isRequired: false,
    sortOrder: 4,
    placeholder: "Optional",
  },
  {
    key: "bedrooms",
    displayName: "Bedrooms",
    fieldType: "number",
    category: "listing_details",
    isRequired: true,
    sortOrder: 5,
    placeholder: "0 for studio",
  },
  {
    key: "bathrooms",
    displayName: "Bathrooms",
    fieldType: "number",
    category: "listing_details",
    isRequired: true,
    sortOrder: 6,
    placeholder: "E.g. 1.5",
  },
  {
    key: "squareFeet",
    displayName: "Square Feet",
    fieldType: "number",
    category: "listing_details",
    isRequired: false,
    sortOrder: 7,
  },
  {
    key: "monthlyRentCents",
    displayName: "Monthly Rent ($)",
    fieldType: "number",
    category: "listing_details",
    isRequired: true,
    sortOrder: 8,
    placeholder: "E.g. 1500",
    helpText: "Enter the monthly rent in dollars. Stored in cents internally.",
  },
  {
    key: "leaseTerm",
    displayName: "Lease Term",
    fieldType: "select",
    category: "listing_details",
    isRequired: true,
    sortOrder: 9,
    options: [
      { label: "Month-to-month", value: LEASE_TERM_MONTH_VALUES[0] },
      { label: "6 months", value: LEASE_TERM_MONTH_VALUES[1] },
      { label: "1 year", value: LEASE_TERM_MONTH_VALUES[2] },
      { label: "2 years", value: LEASE_TERM_MONTH_VALUES[3] },
    ],
  },

  {
    key: "name",
    displayName: "Property Name",
    fieldType: "text",
    category: "property_info",
    isRequired: true,
    sortOrder: 10,
    placeholder: "E.g. Elm Village",
  },
  {
    key: "street1",
    displayName: "Street address 1",
    fieldType: "text",
    category: "property_info",
    isRequired: true,
    sortOrder: 11,
  },
  {
    key: "street2",
    displayName: "Street address 2",
    fieldType: "text",
    category: "property_info",
    isRequired: false,
    sortOrder: 12,
  },
  {
    key: "city",
    displayName: "City",
    fieldType: "text",
    category: "property_info",
    isRequired: true,
    sortOrder: 13,
  },
  {
    key: "province",
    displayName: "Province",
    fieldType: "text",
    category: "property_info",
    isRequired: true,
    sortOrder: 14,
  },
  {
    key: "postalCode",
    displayName: "Postal Code",
    fieldType: "text",
    category: "property_info",
    isRequired: true,
    sortOrder: 15,
  },
  {
    key: "contactName",
    displayName: "Contact Name",
    fieldType: "text",
    category: "property_info",
    isRequired: true,
    sortOrder: 16,
  },
  {
    key: "contactEmail",
    displayName: "Contact Email",
    fieldType: "email",
    category: "property_info",
    isRequired: true,
    sortOrder: 17,
  },
  {
    key: "contactPhone",
    displayName: "Contact Phone",
    fieldType: "tel",
    category: "property_info",
    isRequired: true,
    sortOrder: 18,
  },
  {
    key: "applicationUrl",
    displayName: "Application URL",
    fieldType: "url",
    category: "property_info",
    isRequired: false,
    sortOrder: 19,
    placeholder: "https://example.org/apply",
  },
];
