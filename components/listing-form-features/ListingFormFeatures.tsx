import { useId } from "react";

import { ListingFormControl, type ListingFormInput } from "@/app/listing-form/types";
import { listingFormSectionId } from "@/app/listing-form/fieldDefinitions";
import { useAccessibilityFeaturesQuery } from "@/app/listing-form/useAccessibilityFeaturesQuery";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FormField, FormItem } from "@/components/ui/form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FormSection } from "@/components/listing-form-layout/ListingFormLayout";
import { toSentenceCase } from "@/lib/listing-format";
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
  /** The description renters read on the listing, when it says more than the label. */
  publicText?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();
  const helpId = `${id}-help`;
  // The listings API falls back to the feature's name when it has no description.
  const showPublicText = Boolean(
    publicText?.trim() && publicText.trim().toLowerCase() !== label.toLowerCase(),
  );

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3 py-3 transition-colors",
        // A tinted row makes the few features that are on easy to find among the many that are off.
        checked ? "border-primary/30 bg-primary/5" : "border-transparent",
      )}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <Label htmlFor={id} className="cursor-pointer text-[0.9375rem] font-medium">
          {label}
        </Label>
        {helpText || showPublicText ? (
          <div id={helpId} className="space-y-0.5 text-sm text-muted-foreground">
            {helpText ? <p>{helpText}</p> : null}
            {showPublicText ? <p>Renters see: &ldquo;{publicText}&rdquo;</p> : null}
          </div>
        ) : null}
      </div>
      <Switch
        id={id}
        className="mt-0.5"
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-describedby={helpText || showPublicText ? helpId : undefined}
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
            <FormItem className="md:col-span-2">
              <Accordion
                type="multiple"
                // Opens the first category and any with features already on.
                defaultValue={featureGroups
                  .filter(
                    (group, index) =>
                      index === 0 || group.options.some((option) => selectedIds.has(option.id)),
                  )
                  .map((group) => group.groupId)}
                className="overflow-visible rounded-none border-t"
              >
                {featureGroups.map((group) => {
                  const groupSelectedCount = group.options.filter((option) =>
                    selectedIds.has(option.id),
                  ).length;

                  return (
                    <AccordionItem
                      key={group.groupId}
                      value={group.groupId}
                      className="mb-0 rounded-none border-0 border-b data-[state=open]:bg-transparent"
                    >
                      <AccordionTrigger className="-mx-2 gap-3 rounded-lg px-2 py-4 text-left text-base font-semibold hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/30">
                        <span className="min-w-0 flex-1">{toSentenceCase(group.groupLabel)}</span>
                        <span
                          className={cn(
                            "shrink-0 text-sm font-normal",
                            groupSelectedCount > 0
                              ? "font-medium text-primary-text"
                              : "text-muted-foreground",
                          )}
                        >
                          {groupSelectedCount} of {group.options.length} selected
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="-mx-2 pb-4">
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          {group.options.map((option) => (
                            <FeatureSwitch
                              key={option.id}
                              label={toSentenceCase(option.label)}
                              helpText={option.helpText}
                              publicText={option.description}
                              checked={selectedIds.has(option.id)}
                              onCheckedChange={(isOn) => setFeature(group, option, isOn)}
                            />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </FormItem>
          </FormSection>
        );
      }}
    />
  );
}
