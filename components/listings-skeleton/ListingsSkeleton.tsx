import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the search page's layout: filter bar, results bar, card grid and map. */
export default function ListingsSkeleton() {
  return (
    <div data-fullscreen className="flex min-h-0 flex-1 flex-col overflow-hidden" aria-busy>
      <span className="sr-only">Loading listings</span>
      <div className="flex shrink-0 flex-col border-b bg-background xl:h-16 xl:flex-row xl:items-center xl:gap-6 xl:px-6">
        <div className="flex items-center gap-2 px-4 py-3 sm:h-16 sm:px-6 sm:py-0 xl:flex-1 xl:px-0">
          <Skeleton className="h-11 flex-1 rounded-lg sm:max-w-sm md:h-10" />
          <Skeleton className="hidden h-10 w-20 rounded-lg md:block" />
          <Skeleton className="hidden h-10 w-20 rounded-lg md:block" />
          <Skeleton className="hidden h-10 w-20 rounded-lg md:block" />
          <Skeleton className="size-11 rounded-lg sm:h-10 sm:w-24" />
        </div>
        <div className="flex items-center gap-2 border-t px-4 py-2 sm:gap-3 sm:px-6 xl:border-0 xl:p-0">
          <Skeleton className="mr-auto h-4 w-28" />
          <Skeleton className="h-11 w-28 rounded-lg md:h-10" />
          <Skeleton className="h-11 w-28 rounded-lg md:h-10 lg:w-52" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] content-start gap-x-5 gap-y-6 overflow-hidden p-4 sm:px-6 lg:basis-1/2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[3/2] w-full rounded-xl" />
              <div className="space-y-2 px-0.5">
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="hidden rounded-none lg:block lg:basis-1/2" />
      </div>
    </div>
  );
}
