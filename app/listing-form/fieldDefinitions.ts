import type { ListingFormInput } from "./types";

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
    placeholder: "Short description of the unit and amenities...",
    colSpan: 2,
  },
  {
    key: "propertyType",
    displayName: "Rental Type",
    fieldType: "select",
    category: "listing_details",
    isRequired: true,
    sortOrder: 3,
    options: [
      { label: "Rent", value: "Rent" },
      { label: "Sublet", value: "Sublet" },
      { label: "Lease Transfer", value: "Lease Transfer" },
    ],
  },
  {
    key: "buildingType",
    displayName: "Building Type",
    fieldType: "select",
    category: "listing_details",
    isRequired: true,
    sortOrder: 4,
    options: [
      { label: "Apartment", value: "Apartment" },
      { label: "House", value: "House" },
      { label: "Townhouse", value: "Townhouse" },
      { label: "Condo", value: "Condo" },
    ],
  },
  {
    key: "unitStory",
    displayName: "Floor",
    fieldType: "number",
    category: "listing_details",
    isRequired: false,
    sortOrder: 5,
    placeholder: "E.g. 1",
  },
  {
    key: "unitNumber",
    displayName: "Unit Number",
    fieldType: "text",
    category: "listing_details",
    isRequired: false,
    sortOrder: 6,
    placeholder: "Optional",
  },
  {
    key: "bedrooms",
    displayName: "Bedrooms",
    fieldType: "number",
    category: "listing_details",
    isRequired: true,
    sortOrder: 7,
    placeholder: "0 for studio",
  },
  {
    key: "bathrooms",
    displayName: "Bathrooms",
    fieldType: "number",
    category: "listing_details",
    isRequired: true,
    sortOrder: 8,
    placeholder: "E.g. 1.5",
  },
  {
    key: "squareFeet",
    displayName: "Square Feet",
    fieldType: "number",
    category: "listing_details",
    isRequired: false,
    sortOrder: 9,
  },
  {
    key: "monthlyRentCents",
    displayName: "Monthly Rent ($)",
    fieldType: "number",
    category: "listing_details",
    isRequired: true,
    sortOrder: 10,
    placeholder: "E.g. 1500",
    helpText: "Enter the monthly rent in dollars. Stored in cents internally.",
  },
  {
    key: "leaseTerm",
    displayName: "Lease Term",
    fieldType: "select",
    category: "listing_details",
    isRequired: true,
    sortOrder: 11,
    options: [
      { label: "Month-to-month", value: "Month-to-month" },
      { label: "6 months", value: "6 months" },
      { label: "1 year", value: "1 year" },
      { label: "2 years", value: "2 years" },
    ],
  },

  {
    key: "name",
    displayName: "Property Name",
    fieldType: "text",
    category: "property_info",
    isRequired: true,
    sortOrder: 12,
    placeholder: "E.g. Elm Village",
  },
  {
    key: "street1",
    displayName: "Street address 1",
    fieldType: "text",
    category: "property_info",
    isRequired: true,
    sortOrder: 13,
  },
  {
    key: "street2",
    displayName: "Street address 2",
    fieldType: "text",
    category: "property_info",
    isRequired: false,
    sortOrder: 14,
  },
  {
    key: "city",
    displayName: "City",
    fieldType: "text",
    category: "property_info",
    isRequired: true,
    sortOrder: 15,
  },
  {
    key: "province",
    displayName: "Province",
    fieldType: "text",
    category: "property_info",
    isRequired: true,
    sortOrder: 16,
  },
  {
    key: "postalCode",
    displayName: "Postal Code",
    fieldType: "text",
    category: "property_info",
    isRequired: true,
    sortOrder: 17,
  },
  {
    key: "contactName",
    displayName: "Contact Name",
    fieldType: "text",
    category: "property_info",
    isRequired: true,
    sortOrder: 18,
  },
  {
    key: "contactEmail",
    displayName: "Contact Email",
    fieldType: "email",
    category: "property_info",
    isRequired: true,
    sortOrder: 19,
  },
  {
    key: "contactPhone",
    displayName: "Contact Phone",
    fieldType: "tel",
    category: "property_info",
    isRequired: true,
    sortOrder: 20,
  },
  {
    key: "applicationUrl",
    displayName: "Application URL",
    fieldType: "url",
    category: "property_info",
    isRequired: false,
    sortOrder: 21,
    placeholder: "https://example.org/apply",
  },
];
