import { Skeleton } from "@/components/ui/skeleton";
import { ListingFormLayout, FormSection } from "@/components/listing-form-layout/ListingFormLayout";
import { CORE_FIELD_CATEGORIES } from "@/app/listing-form/fieldDefinitions";

export function ListingFormSkeleton() {
  return (
    <ListingFormLayout
      header={
        <div className="space-y-3">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
      }
      sectionNav={
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      }
      formContent={
        <>
          {CORE_FIELD_CATEGORIES.map((cat) => (
            <FormSection key={cat.key} title={cat.displayName} description={cat.description}>
              {Array.from({ length: cat.key === "listing_details" ? 8 : 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </FormSection>
          ))}
        </>
      }
      previewContent={<Skeleton className="h-[520px] w-full rounded-lg" />}
      footer={<Skeleton className="h-10 w-32" />}
    />
  );
}
