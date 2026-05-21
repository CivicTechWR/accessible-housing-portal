import { ListingFormControl } from "@/app/listing-form/types";
import { useAccessibilityFeaturesQuery } from "@/app/listing-form/useAccessibilityFeaturesQuery";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleField } from "@/components/toggle-field/ToggleField";
import { FormField, FormItem, FormControl } from "@/components/ui/form";
import { FormSection } from "@/components/listing-form-layout/ListingFormLayout";
export interface ListingFormFeaturesProps {
  control: ListingFormControl;
}

export function ListingFormFeatures({ control }: ListingFormFeaturesProps) {
  const { data: featureGroups, isLoading, isError } = useAccessibilityFeaturesQuery();

  if (isLoading) {
    return (
      <FormSection isSeparated title="Accessibility Features">
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
    );
  }

  if (isError || !featureGroups) {
    return (
      <FormSection isSeparated title="Accessibility Features">
        <p className="md:col-span-2 text-destructive">
          Failed to load accessibility features. Please try again later.
        </p>
      </FormSection>
    );
  }

  return (
    <FormSection
      isSeparated
      title="Accessibility Features"
      description="Select all accessibility features that apply to this listing. These details help housing searchers find spaces that meet their distinct accessibility needs."
    >
      {featureGroups.map((group) => (
        <div key={group.groupId} className="md:col-span-2 space-y-4">
          <div>
            <h4 className="text-lg font-medium">{group.groupLabel}</h4>
            <hr className="mt-2" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 pt-2">
            {group.options.map((option) => (
              <FormField
                key={option.id}
                control={control}
                name="customFeatures"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ToggleField
                        title={option.label}
                        description={[
                          option.helpText,
                          option.description &&
                            `Public listing text: This is shown to renters and applicants on the listing. ${option.description}`,
                        ]
                          .filter(Boolean)
                          .join("\n\n")}
                        variant="primary"
                        options={[
                          { label: "Yes", value: "yes" },
                          { label: "No", value: "no" },
                        ]}
                        value={
                          field.value?.some((feature) => feature.id === option.id) ? "yes" : "no"
                        }
                        onValueChange={(val) => {
                          const currentFeatures = field.value ?? [];

                          if (val === "yes") {
                            const isAlreadySelected = currentFeatures.some(
                              (feature) => feature.id === option.id,
                            );

                            if (!isAlreadySelected) {
                              field.onChange([
                                ...currentFeatures,
                                {
                                  category: group.groupLabel,
                                  id: option.id,
                                  name: option.label,
                                  description: option.description ?? option.label,
                                },
                              ]);
                            }
                          } else if (val === "no") {
                            field.onChange(
                              currentFeatures.filter((feature) => feature.id !== option.id),
                            );
                          }
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>
      ))}
    </FormSection>
  );
}
