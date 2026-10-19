export type ListingFeatureDefinition = {
  key: string;
  label: string;
  description: string | null;
  category: string;
  sortOrder: number;
};

const LEGACY_FEATURE_ALIASES_BY_KEY: Record<string, string[]> = {
  automated_building_doors: ["Automatic door opener", "Automatic door openers"],
  elevator_in_building: ["Elevator access", "Elevator"],
  lowered_kitchen_counters: ["Lowered counters"],
  main_entrance_is_barrier_free: ["Barrier-free entry", "Ramp entry", "Step-free entry"],
};

export function normalizeListingFeatureToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function getListingFeatureSearchTerms(
  definition: Pick<ListingFeatureDefinition, "key" | "label">,
) {
  return [definition.label, ...(LEGACY_FEATURE_ALIASES_BY_KEY[definition.key] ?? [])];
}

export function buildListingFeatureDefinitionLookup(definitions: ListingFeatureDefinition[]) {
  const byKey = new Map<string, ListingFeatureDefinition>();
  const byToken = new Map<string, ListingFeatureDefinition>();

  for (const definition of definitions) {
    byKey.set(definition.key, definition);

    for (const searchTerm of getListingFeatureSearchTerms(definition)) {
      byToken.set(normalizeListingFeatureToken(searchTerm), definition);
    }
  }

  return {
    byKey,
    byToken,
  };
}
