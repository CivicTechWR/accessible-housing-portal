import { HOUSING_DEFINITIONS } from "@/shared/housing-definitions";
import {
  LISTING_BUILDING_TYPE_VALUES,
  UTILITY_INCLUDED_LABELS,
  UTILITY_INCLUDED_VALUES,
} from "@/shared/schemas/listings";
import { HEATING_TYPE_LABELS, HEATING_TYPE_VALUES } from "@/shared/heating-type";
import type { ListingFormInput } from "./types";

export type CoreFieldType =
  | "text"
  | "number"
  | "select"
  | "textarea"
  | "email"
  | "tel"
  | "url"
  | "checkbox-group";

export interface FieldOption {
  label: string;
  value: string;
}

type KeysMatching<T, V> = {
  [K in keyof T]-?: T[K] extends V ? K : never;
}[keyof T];

type ListingStringKey = Extract<KeysMatching<ListingFormInput, string | undefined>, string>;
type ListingNumberKey = Extract<KeysMatching<ListingFormInput, number | null | undefined>, string>;
type ListingStringArrayKey = Extract<KeysMatching<ListingFormInput, string[] | undefined>, string>;

interface BaseCoreFieldDefinition {
  displayName: string;
  category: string;
  helpText?: string;
  isRequired: boolean;
  sortOrder: number;
  colSpan?: 1 | 2;
  /** Keeps this half-width field beside its neighbour on phones too. Set it on both fields. */
  pairOnMobile?: true;
  /**
   * Puts this short field in a row of three with the neighbouring fields that also set it
   * (at every width, so keep them short). Set it on consecutive fields.
   */
  rowOfThree?: true;
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

interface CheckboxGroupFieldDefinition extends BaseCoreFieldDefinition {
  key: ListingStringArrayKey;
  fieldType: "checkbox-group";
  options: FieldOption[];
}

export type CoreFieldDefinition =
  | TextLikeFieldDefinition
  | SelectFieldDefinition
  | NumberFieldDefinition
  | CheckboxGroupFieldDefinition;

export const CORE_FIELD_CATEGORIES = [
  {
    key: "listing_details",
    displayName: "Listing details",
    /** The section strip's label on phones. */
    shortName: "Details",
    description: "The unit, its rent and what's included.",
  },
  {
    key: "property_info",
    displayName: "Property and contact",
    shortName: "Property",
    description: "Where the building is and who navigators can contact.",
  },
  {
    key: "application",
    displayName: "How to apply",
    shortName: "Apply",
    description:
      "Applications happen outside the portal. Add application contacts and any other information applicants should know.",
  },
] as const;

/** The section nav's anchor for each card in the form. */
export function listingFormSectionId(
  section: (typeof CORE_FIELD_CATEGORIES)[number]["key"] | "images" | "features",
) {
  return `section-${section}`;
}

export const CORE_FIELD_DEFINITIONS: CoreFieldDefinition[] = [
  {
    key: "title",
    displayName: "Title",
    fieldType: "text",
    category: "listing_details",
    isRequired: true,
    sortOrder: 1,
    colSpan: 2,
    helpText: 'Shown first on search results. For example, "Sunny 2-bedroom apartment".',
  },
  {
    key: "description",
    displayName: "Description",
    fieldType: "textarea",
    category: "listing_details",
    isRequired: false,
    sortOrder: 2,
    colSpan: 2,
  },
  {
    key: "buildingType",
    displayName: "Building type",
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
    displayName: "Unit number",
    fieldType: "text",
    category: "listing_details",
    isRequired: false,
    sortOrder: 4,
  },
  {
    key: "bedrooms",
    displayName: "Bedrooms",
    fieldType: "number",
    category: "listing_details",
    isRequired: true,
    sortOrder: 5,
    rowOfThree: true,
    helpText: "Enter 0 for a studio.",
  },
  {
    key: "bathrooms",
    displayName: "Bathrooms",
    fieldType: "number",
    category: "listing_details",
    isRequired: true,
    sortOrder: 6,
    rowOfThree: true,
    helpText: "Half baths count as 0.5.",
  },
  {
    key: "squareFeet",
    displayName: "Square feet",
    fieldType: "number",
    category: "listing_details",
    isRequired: false,
    sortOrder: 7,
    rowOfThree: true,
  },
  {
    key: "monthlyRentCents",
    displayName: "Monthly rent ($)",
    fieldType: "number",
    category: "listing_details",
    isRequired: true,
    sortOrder: 8,
    helpText: "Enter the monthly rent in dollars.",
  },
  {
    key: "depositInfo",
    displayName: "Deposit information",
    fieldType: "textarea",
    category: "listing_details",
    isRequired: false,
    sortOrder: 10,
    colSpan: 2,
    helpText:
      "Describe any deposits required so tenants know what to expect, such as first and last month's rent.",
  },
  {
    key: "leaseTerm",
    displayName: "Initial lease term in months",
    fieldType: "number",
    category: "listing_details",
    isRequired: true,
    sortOrder: 9,
    helpText: HOUSING_DEFINITIONS.leaseTerm.description,
  },
  {
    key: "heatingType",
    displayName: "Primary heating type",
    fieldType: "select",
    category: "listing_details",
    isRequired: false,
    sortOrder: 11,
    colSpan: 2,
    helpText:
      "Select the system that provides most of the unit's heat. Electric resistance includes electric baseboards and electric furnaces.",
    options: HEATING_TYPE_VALUES.map((value) => ({
      label: HEATING_TYPE_LABELS[value],
      value,
    })),
  },
  {
    key: "utilitiesIncluded",
    displayName: "Utilities included",
    fieldType: "checkbox-group",
    category: "listing_details",
    isRequired: false,
    sortOrder: 12,
    colSpan: 2,
    helpText: "Select all utilities included in the monthly rent.",
    options: UTILITY_INCLUDED_VALUES.map((value) => ({
      label: UTILITY_INCLUDED_LABELS[value],
      value,
    })),
  },

  {
    key: "name",
    displayName: "Property name",
    fieldType: "text",
    category: "property_info",
    isRequired: true,
    sortOrder: 10,
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
    pairOnMobile: true,
  },
  {
    key: "postalCode",
    displayName: "Postal code",
    fieldType: "text",
    category: "property_info",
    isRequired: true,
    sortOrder: 15,
    pairOnMobile: true,
  },
  {
    key: "contactName",
    displayName: "Contact name",
    fieldType: "text",
    category: "property_info",
    isRequired: true,
    sortOrder: 16,
  },
  {
    key: "contactRole",
    displayName: "Contact role",
    fieldType: "text",
    category: "property_info",
    isRequired: false,
    sortOrder: 17,
    helpText: 'Such as "Property manager".',
  },
  {
    key: "contactEmail",
    displayName: "Contact email",
    fieldType: "email",
    category: "property_info",
    isRequired: true,
    sortOrder: 18,
  },
  {
    key: "contactPhone",
    displayName: "Contact phone",
    fieldType: "tel",
    category: "property_info",
    isRequired: true,
    sortOrder: 19,
    helpText: "Format: 519-555-0100.",
  },
  {
    key: "applicationUrl",
    displayName: "Application URL",
    fieldType: "url",
    category: "application",
    isRequired: false,
    sortOrder: 20,
    helpText: "A link to your online application form, starting with https://.",
  },
  {
    key: "applicationEmail",
    displayName: "Application email",
    fieldType: "email",
    category: "application",
    isRequired: false,
    sortOrder: 21,
    helpText: "Where navigators should email to apply or arrange a viewing.",
  },
  {
    key: "applicationPhone",
    displayName: "Application phone",
    fieldType: "tel",
    category: "application",
    isRequired: false,
    sortOrder: 22,
    helpText: "Where navigators should call to apply or arrange a viewing. Format: 519-555-0100.",
  },
  {
    key: "applicationInstructions",
    displayName: "Additional application information",
    fieldType: "textarea",
    category: "application",
    isRequired: false,
    sortOrder: 23,
    colSpan: 2,
    helpText:
      "Share anything else applicants should know, such as required documents, viewing arrangements, or response times. This appears on the listing as a note from you.",
  },
];
