import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { PropertySearchIcon } from "@hugeicons/core-free-icons";
import { AppPageShell } from "@/components/page-shell/AppPageShell";
import { Button } from "@/components/ui/button";

export default function ListingNotFound() {
  return (
    <AppPageShell className="flex items-center justify-center">
      <div className="mx-auto w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-xs sm:p-8">
        <span className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <HugeiconsIcon
            icon={PropertySearchIcon}
            strokeWidth={1.75}
            className="size-5"
            aria-hidden
          />
        </span>
        <h1 className="text-xl font-semibold sm:text-2xl">Listing not found</h1>
        <p className="mt-2 text-base text-muted-foreground">
          This listing doesn&apos;t exist or is no longer available.
        </p>
        <div className="mt-6 flex flex-col-reverse justify-center gap-3 sm:flex-row">
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
          <Button asChild>
            <Link href="/listings">Browse listings</Link>
          </Button>
        </div>
      </div>
    </AppPageShell>
  );
}
