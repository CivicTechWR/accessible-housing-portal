import type { Metadata } from "next";
import { Suspense } from "react";

import ListingForm from "@/app/listing-form/ListingForm";
import { ListingFormSkeleton } from "@/components/listing-form-skeleton/ListingFormSkeleton";

export const metadata: Metadata = {
  title: "New Listing | WR Housing Bridge",
};

export const dynamic = "force-dynamic";

export default async function ListingFormPage() {
  return (
    <div data-listing-form-page="true" className="h-full">
      <Suspense fallback={<ListingFormSkeleton />}>
        <ListingForm />
      </Suspense>
    </div>
  );
}
