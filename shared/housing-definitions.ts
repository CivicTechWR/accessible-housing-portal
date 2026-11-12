export interface HousingDefinition {
  /** Accessible name for the info button and popover that explain the term. */
  label: string;
  /** Plain-language explanation shown to housing listers and housing searchers. */
  description: string;
  /** Extra guidance shown only to housing searchers, after the description. */
  searcherNote?: string;
}

/**
 * Plain-language explanations of housing terms, keyed by term.
 *
 * Read the wording from here wherever a term is explained so listers and searchers see the same
 * copy. Add a term here when its explanation is needed in more than one place.
 */
export const HOUSING_DEFINITIONS = {
  leaseTerm: {
    label: "About initial lease terms",
    description:
      "A lease is an agreement between a tenant and a landlord to rent a home. The lease term is the initial rental period in months, excluding any renewals.",
    searcherNote: "Confirm the final lease terms and renewal options with the lister.",
  },
} satisfies Record<string, HousingDefinition>;

export type HousingTerm = keyof typeof HOUSING_DEFINITIONS;
