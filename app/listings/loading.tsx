import ListingsSkeleton from "@/components/listings-skeleton/ListingsSkeleton";

export default function ListingsLoading() {
  return (
    <>
      {/* Matches the loaded page, which hides the site footer. */}
      <div data-hide-site-footer hidden />
      <ListingsSkeleton />
    </>
  );
}
