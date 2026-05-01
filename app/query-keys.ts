export const queryKeys = {
  adminCustomListingFields: () => ["admin", "custom-listing-fields"] as const,
  accessibilityFeatures: () => ["custom-listing-fields", "accessibility-features"] as const,
  listingEditor: (listingId?: string) => ["listing-editor", listingId] as const,
  listings: (queryString: string) => ["listings", queryString] as const,
  myListings: () => ["my-listings"] as const,
  recentInvites: () => ["admin", "account-invites", "recent"] as const,
};

export type ListingsQueryKey = ReturnType<typeof queryKeys.listings>;
export type ListingEditorQueryKey = ReturnType<typeof queryKeys.listingEditor>;
