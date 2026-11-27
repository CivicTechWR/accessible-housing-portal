import type { Metadata } from "next";
import { Suspense } from "react";

import ListingForm from "@/app/listing-form/ListingForm";
import { AppPageShell } from "@/components/page-shell/AppPageShell";
import { ListingFormSkeleton } from "@/components/listing-form-skeleton/ListingFormSkeleton";

export const metadata: Metadata = {
  title: "New listing",
};

export const dynamic = "force-dynamic";

export default async function ListingFormPage() {
  return (
    <AppPageShell className="pb-0 sm:pb-0">
      {/* Tells the site header and footer to go full width with the editor. */}
      <div data-wide-page hidden />
      <Suspense fallback={<ListingFormSkeleton />}>
        <ListingForm />
      </Suspense>
    </AppPageShell>
  );
}
