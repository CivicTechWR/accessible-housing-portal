import { Skeleton } from "@/components/ui/skeleton";
import { ListingFormLayout, FormSection } from "@/components/listing-form-layout/ListingFormLayout";
import { CORE_FIELD_CATEGORIES } from "@/app/listing-form/fieldDefinitions";

export function ListingFormSkeleton() {
  return (
    <ListingFormLayout
      formContent={
        <>
          {CORE_FIELD_CATEGORIES.map((cat, index) => (
            <FormSection
              key={cat.key}
              isSeparated={index > 0}
              title={cat.displayName}
              description={cat.description}
            >
              {Array.from({ length: cat.key === "listing_details" ? 8 : 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </FormSection>
          ))}
          <FormSection isSeparated title="Listing Features">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <Skeleton className="h-5 w-5 rounded shrink-0" />
                <div className="space-y-2 w-full">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </FormSection>
        </>
      }
      previewContent={<Skeleton className="h-[600px] w-full rounded-xl bg-muted/60" />}
      footer={
        <>
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </>
      }
    />
  );
}
