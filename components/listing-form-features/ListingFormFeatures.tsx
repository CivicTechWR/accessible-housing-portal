import { useId } from "react";

import { ListingFormControl, type ListingFormInput } from "@/app/listing-form/types";
import { listingFormSectionId } from "@/app/listing-form/fieldDefinitions";
import { useAccessibilityFeaturesQuery } from "@/app/listing-form/useAccessibilityFeaturesQuery";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
const SECTION_DESCRIPTION = "Turn on each feature or rental condition that applies.";

function FeatureSwitch({
  label,
  helpText,
  publicText,
  checked,
  onCheckedChange,
}: {
  label: string;
  helpText?: string;
  /** The description navigators read on the listing, when it says more than the label. */
  publicText?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  // The listings API falls back to the feature's name when it has no description.
  const hasPublicText = Boolean(
    publicText?.trim() && publicText.trim().toLowerCase() !== label.toLowerCase(),
  );
  // The one-line definition under the name: the provider-facing help, or else what the listing
  // will say.
  const definition = helpText || (hasPublicText ? publicText : undefined);
  // Once a feature is on, the row also quotes what the listing will show, if that differs.
  const quotesPublicText = checked && hasPublicText && definition !== publicText;

  return (
    // The whole row is the switch's label, so tapping anywhere on it toggles the feature.
    <label
      htmlFor={id}
      className={cn(
        "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors",
        // A tinted row makes the few features that are on easy to find among the many that are off.
        checked ? "border-primary/30 bg-primary/5" : "border-transparent hover:bg-muted/50",
      )}
    >
      <span className="min-w-0 flex-1 space-y-0.5">
        <span id={labelId} className="block text-base font-medium">
          {label}
        </span>
        {definition || quotesPublicText ? (
          <span id={descriptionId} className="block space-y-1 text-sm text-muted-foreground">
            {definition ? <span className="block">{definition}</span> : null}
            {quotesPublicText ? (
              <span className="block">
                <span className="font-medium text-foreground">Listing shows:</span> &ldquo;
                {publicText}
                &rdquo;
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
      <Switch
        id={id}
        className="mt-0.5"
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-labelledby={labelId}
        aria-describedby={definition || quotesPublicText ? descriptionId : undefined}
      />
    </label>
  );
}

/** "N of M selected": plain muted text, or a tinted pill once anything is selected. */
function SelectedCount({ count, total }: { count: number; total?: number }) {
  const text = total === undefined ? `${count} selected` : `${count} of ${total} selected`;
  if (count === 0) {
    return <span className="shrink-0 text-sm font-normal text-muted-foreground">{text}</span>;
  }
  return (
    <Badge variant="default" className="shrink-0 font-medium">
      {text}
    </Badge>
  );
}

export function ListingFormFeatures({ control }: ListingFormFeaturesProps) {
  const { data: featureGroups, isLoading, isError } = useAccessibilityFeaturesQuery();
  const sectionId = listingFormSectionId("features");

  if (isLoading) {
    return (
      <FormSection id={sectionId} title={SECTION_TITLE} description={SECTION_DESCRIPTION}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="col-span-2 flex items-start gap-3">
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
        <p className="col-span-2 text-destructive">
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
              <span className="mt-1">
                <SelectedCount count={selectedIds.size} />
              </span>
            }
          >
            <FormItem className="col-span-2">
              <Accordion
                type="multiple"
                // Only categories with features already on start open.
                defaultValue={featureGroups
                  .filter((group) => group.options.some((option) => selectedIds.has(option.id)))
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
                        <SelectedCount count={groupSelectedCount} total={group.options.length} />
                      </AccordionTrigger>
                      <AccordionContent className="-mx-2 pb-4">
                        {/* One column, so each feature's definition sits under its name. */}
                        <div className="flex max-w-2xl flex-col gap-1">
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
