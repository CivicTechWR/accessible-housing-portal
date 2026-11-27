import { AppPageShell, pageWidths } from "@/components/page-shell/AppPageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Mirrors the listing page: title, key facts, photos, then the details beside the contact card. */
export default function ListingLoading() {
  return (
    <AppPageShell className="bg-background">
      <div aria-busy className={cn("mx-auto flex w-full flex-col gap-8", pageWidths.content)}>
        <span className="sr-only">Loading listing</span>
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-2/3 max-w-md" />
            <Skeleton className="h-5 w-56" />
          </div>
          <div className="flex flex-wrap gap-5">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <Skeleton className="aspect-[4/3] w-full rounded-xl md:aspect-[2/1]" />
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
          <div className="space-y-4">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-5/6" />
            <Skeleton className="h-5 w-4/6" />
          </div>
          <Skeleton className="hidden h-72 rounded-xl lg:block" />
        </div>
      </div>
    </AppPageShell>
  );
}
