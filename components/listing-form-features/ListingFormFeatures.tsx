import { useId } from "react";

import { ListingFormControl, type ListingFormInput } from "@/app/listing-form/types";
import { listingFormSectionId } from "@/app/listing-form/fieldDefinitions";
import { useAccessibilityFeaturesQuery } from "@/app/listing-form/useAccessibilityFeaturesQuery";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FormField, FormItem } from "@/components/ui/form";
import { InfoPopover } from "@/components/info-popover/InfoPopover";
import { FormSection } from "@/components/listing-form-layout/ListingFormLayout";
import { cn } from "@/lib/utils";

export interface ListingFormFeaturesProps {
  control: ListingFormControl;
}

type SelectedFeature = NonNullable<ListingFormInput["customFeatures"]>[number];

const SECTION_TITLE = "Features and accessibility";
const SECTION_DESCRIPTION =
  "Turn on each feature or rental condition that applies. Everything starts off.";

function FeatureSwitch({
  label,
  helpText,
  publicText,
  checked,
  onCheckedChange,
}: {
  label: string;
  helpText?: string;
  publicText?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();
  const helpId = `${id}-help`;
  // The row shows one line of help; the popover has all of it and what renters will read.
  const details = [helpText, publicText ? `Renters see: "${publicText}"` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-1">
          <Label htmlFor={id} className="cursor-pointer text-[0.9375rem] font-medium">
            {label}
          </Label>
          {details ? <InfoPopover label={`More about ${label}`} description={details} /> : null}
        </div>
        {helpText ? (
          <p id={helpId} className="line-clamp-1 text-sm text-muted-foreground">
            {helpText}
          </p>
        ) : null}
      </div>
      <Switch
        id={id}
        className="mt-0.5"
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-describedby={helpText ? helpId : undefined}
      />
    </div>
  );
}

export function ListingFormFeatures({ control }: ListingFormFeaturesProps) {
  const { data: featureGroups, isLoading, isError } = useAccessibilityFeaturesQuery();
  const sectionId = listingFormSectionId("features");

  if (isLoading) {
    return (
      <FormSection id={sectionId} title={SECTION_TITLE} description={SECTION_DESCRIPTION}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-full space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
            <Skeleton className="h-6 w-11 shrink-0 rounded-full" />
          </div>
        ))}
      </FormSection>
    );
  }

  if (isError || !featureGroups) {
    return (
      <FormSection id={sectionId} title={SECTION_TITLE}>
        <p className="text-destructive md:col-span-2">
          Failed to load listing features. Please try again later.
        </p>
      </FormSection>
    );
  }

  return (
    <FormField
      control={control}
      name="customFeatures"
      render={({ field }) => {
        const selected: SelectedFeature[] = field.value ?? [];
        const selectedIds = new Set(selected.map((feature) => feature.id));
        const setFeature = (
          group: (typeof featureGroups)[number],
          option: (typeof featureGroups)[number]["options"][number],
          isOn: boolean,
        ) => {
          if (isOn === selectedIds.has(option.id)) return;
          field.onChange(
            isOn
              ? [
                  ...selected,
                  {
                    category: group.groupLabel,
                    id: option.id,
                    name: option.label,
                    description: option.description ?? option.label,
                  },
                ]
              : selected.filter((feature) => feature.id !== option.id),
          );
        };

        return (
          <FormSection
            id={sectionId}
            title={SECTION_TITLE}
            description={SECTION_DESCRIPTION}
            headerAside={
              <Badge variant={selectedIds.size > 0 ? "default" : "secondary"} className="mt-1">
                {selectedIds.size} selected
              </Badge>
            }
          >
            <FormItem className="gap-6 md:col-span-2">
              {featureGroups.map((group) => {
                const groupSelectedCount = group.options.filter((option) =>
                  selectedIds.has(option.id),
                ).length;
                const headingId = `feature-group-${group.groupId}`;

                return (
                  <div key={group.groupId} role="group" aria-labelledby={headingId}>
                    <div className="flex items-baseline justify-between gap-3 border-b pb-2">
                      <h3 id={headingId} className="text-base font-semibold">
                        {group.groupLabel}
                      </h3>
                      <span
                        className={cn(
                          "shrink-0 text-sm",
                          groupSelectedCount > 0
                            ? "font-medium text-primary-text"
                            : "text-muted-foreground",
                        )}
                      >
                        {groupSelectedCount} of {group.options.length} selected
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-x-8 divide-y md:grid-cols-2 md:divide-y-0 md:[&>*]:border-b">
                      {group.options.map((option) => (
                        <FeatureSwitch
                          key={option.id}
                          label={option.label}
                          helpText={option.helpText}
                          publicText={option.description}
                          checked={selectedIds.has(option.id)}
                          onCheckedChange={(isOn) => setFeature(group, option, isOn)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </FormItem>
          </FormSection>
        );
      }}
    />
  );
}
