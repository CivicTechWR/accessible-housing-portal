import "server-only";

import { getOptionalSession } from "@/lib/auth/session";
import { formatWalkScoreAddress } from "@/lib/walk-score/address";
import { findListingRecordById } from "@/lib/listings/listing.repository";
import { canReadListing } from "@/lib/policies/listing-policy";
import { getWalkScore, type WalkScoreResult } from "@/lib/walk-score/walk-score.client";
import type { ListingIdParam } from "@/shared/schemas/listings";

export async function getListingWalkScoreService(
  listingId: ListingIdParam,
): Promise<WalkScoreResult> {
  if (!process.env.WALKSCORE_API_KEY) {
    return null;
  }

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

    const address = formatWalkScoreAddress({
      ...listing.property,
      unitNumber: listing.unitNumber,
    });

    return await getWalkScore({ address, latitude, longitude });
  } catch {
    console.warn("[walk-score] Listing lookup failed.");
    return null;
  }
}
