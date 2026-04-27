import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AppPageShell, PageMessage } from "@/components/page-shell/AppPageShell";
import { getMyListingsService } from "@/lib/listings/listing.service";
import { MyListingsClient } from "@/app/my-listings/MyListingsClient";

export const metadata: Metadata = {
  title: "My Listings | WR Housing Bridge",
};

export default async function MyListingsPage() {
  const renderedAt = new Date().toISOString();
  const result = await getMyListingsService();

  if (!result.ok) {
    return (
      <PageMessage
        title="My Listings"
        width="5xl"
        tone="error"
        className="bg-muted/40 px-4 py-8 sm:px-6"
        contentClassName="rounded-xl"
        titleClassName="text-2xl"
      >
        {result.error.message}
      </PageMessage>
    );
  }

  return (
    <AppPageShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My Listings</h1>
            <p className="text-sm text-muted-foreground">
              Drafts autosave here as you build them. Publish when the listing is ready.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/listing-form">New listing</Link>
          </Button>
        </div>

        <MyListingsClient initialListings={result.value.data} renderedAt={renderedAt} />
      </div>
    </AppPageShell>
  );
}
