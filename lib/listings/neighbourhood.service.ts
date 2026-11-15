import "server-only";

import { getOptionalSession } from "@/lib/auth/session";
import { findListingRecordById } from "@/lib/listings/listing.repository";
import { canReadListing } from "@/lib/policies/listing-policy";
import {
  buildNeighbourhoodDetails,
  type NeighbourhoodDetailsResult,
} from "@/lib/neighbourhood/neighbourhood";
import { loadBlocks, loadPlaces } from "@/lib/neighbourhood/neighbourhood.data";
import type { ListingIdParam } from "@/shared/schemas/listings";

export async function getListingNeighbourhoodService(
  listingId: ListingIdParam,
): Promise<NeighbourhoodDetailsResult | null> {
  try {
    const optionalSession = await getOptionalSession();

    if (!optionalSession.session || !optionalSession.authzUser) {
      return null;
    }

    const listing = await findListingRecordById(listingId);

    if (
      !listing ||
      !canReadListing(
        {
          ownerUserId: listing.property.ownerUserId,
          status: listing.status,
        },
        {
          userId: optionalSession.session.user.id,
          role: optionalSession.authzUser.role,
        },
      )
    ) {
      return null;
    }

    const { latitude, longitude } = listing.property;

    if (latitude === null || longitude === null) {
      return null;
    }

    const [blocks, places] = await Promise.all([loadBlocks(), loadPlaces()]);

    return buildNeighbourhoodDetails(latitude, longitude, blocks, places);
  } catch {
    console.warn("[neighbourhood] Listing lookup failed.");
    return null;
  }
}
