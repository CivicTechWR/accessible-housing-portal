import type { Metadata } from "next";
import { Suspense } from "react";

import ListingForm from "@/app/listing-form/ListingForm";
import { AppPageShell } from "@/components/page-shell/AppPageShell";
import { ListingFormSkeleton } from "@/components/listing-form-skeleton/ListingFormSkeleton";

export const metadata: Metadata = {
  title: "Edit listing",
};

export const dynamic = "force-dynamic";

export default async function EditListingFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppPageShell className="pb-0 sm:pb-0">
      <Suspense fallback={<ListingFormSkeleton />}>
        <ListingForm listingId={id} />
      </Suspense>
    </AppPageShell>
  );
}
