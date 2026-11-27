import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { AppPageShell, PageHeader, pageWidths } from "@/components/page-shell/AppPageShell";
import { getMyListingsService } from "@/lib/listings/listing.service";
import { MyListingsClient } from "@/app/my-listings/MyListingsClient";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "My listings",
};

export default async function MyListingsPage() {
  const renderedAt = new Date().toISOString();
  const result = await getMyListingsService();

  return (
    <AppPageShell>
      <div className={cn("mx-auto space-y-6", pageWidths.content)}>
        <PageHeader
          title="My listings"
          description="Drafts save automatically as you build them. Publish when the listing is ready."
          actions={
            <Button asChild>
              <Link href="/listing-form">
                <HugeiconsIcon
                  icon={Add01Icon}
                  strokeWidth={2}
                  data-icon="inline-start"
                  aria-hidden
                />
                New listing
              </Link>
            </Button>
          }
        />

        {result.ok ? (
          <MyListingsClient initialListings={result.value.data} renderedAt={renderedAt} />
        ) : (
          <AlertBanner variant="error">{result.error.message}</AlertBanner>
        )}
      </div>
    </AppPageShell>
  );
}
