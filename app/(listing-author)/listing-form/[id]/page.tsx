import type { Metadata } from "next";
import { Suspense } from "react";

import ListingForm from "@/app/listing-form/ListingForm";
import { ListingFormSkeleton } from "@/components/listing-form-skeleton/ListingFormSkeleton";

export const metadata: Metadata = {
  title: "Edit Listing | WR Housing Bridge",
};

export const dynamic = "force-dynamic";

export default async function EditListingFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div data-listing-form-page="true" className="h-full">
      <Suspense fallback={<ListingFormSkeleton />}>
        <ListingForm listingId={id} />
      </Suspense>
    </div>
  );
}
