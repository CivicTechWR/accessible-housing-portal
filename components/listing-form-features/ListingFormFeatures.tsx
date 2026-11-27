import { useId } from "react";

import { ListingFormControl, type ListingFormInput } from "@/app/listing-form/types";
import { listingFormSectionId } from "@/app/listing-form/fieldDefinitions";
import { useAccessibilityFeaturesQuery } from "@/app/listing-form/useAccessibilityFeaturesQuery";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { AccessibilityMark } from "@/components/ui/accessibility-mark";
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
  "Navigators use these to find homes that fit. Turn on each one that applies.";

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
        "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/50",
      )}
    >
      <span className="min-w-0 flex-1 space-y-0.5">
        <span id={labelId} className="flex items-start gap-2 text-base font-medium">
          {/* The accessibility mark makes the few features that are on easy to find among the
              many that are off. The switch stays blue because it's the control. */}
          {checked ? <AccessibilityMark size="sm" className="mt-0.5" /> : null}
          {label}
        </span>
        {definition || quotesPublicText ? (
          <span id={descriptionId} className="block space-y-0.5 text-sm leading-relaxed">
            {definition ? <span className="block text-foreground/80">{definition}</span> : null}
            {/* One quiet line, so switching a feature on doesn't make its row much taller. */}
            {quotesPublicText ? (
              <span
                className="block truncate text-muted-foreground"
                title={`Listing shows: “${publicText}”`}
              >
                Listing shows: &ldquo;{publicText}&rdquo;
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

const MAX_CHIPS = 2;

/**
 * What's on in a collapsed category, as small chips ("Elevator in building", "+3"), so the
 * state shows without opening it. Hidden while the category is open, where the rows say it.
 */
function SelectedChips({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  const shown = names.slice(0, MAX_CHIPS);
  const more = names.length - shown.length;
  return (
    <span className="flex min-w-0 items-center gap-1.5 group-aria-expanded/accordion-trigger:hidden">
      {shown.map((name) => (
        <span
          key={name}
          title={name}
          className="min-w-0 truncate rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
        >
          {name}
        </span>
      ))}
      {more > 0 ? (
        <span className="shrink-0 text-xs font-medium text-muted-foreground">+{more}</span>
      ) : null}
    </span>
  );
}

/** "N of M selected": muted while nothing is selected, then in the text colour. */
function SelectedCount({ count, total }: { count: number; total?: number }) {
  const text = total === undefined ? `${count} selected` : `${count} of ${total} selected`;
  return (
    <span
      className={cn(
        "shrink-0 text-sm whitespace-nowrap",
        count === 0 ? "font-normal text-muted-foreground" : "font-medium text-foreground",
      )}
    >
      {text}
    </span>
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
                // The first category starts open so the switches are in view; each closed row
                // lists what's on in it.
                defaultValue={featureGroups[0] ? [featureGroups[0].groupId] : []}
                className="overflow-visible rounded-none border-t"
              >
                {featureGroups.map((group) => {
                  const groupSelectedNames = group.options
                    .filter((option) => selectedIds.has(option.id))
                    .map((option) => toSentenceCase(option.label));

                  return (
                    <AccordionItem
                      key={group.groupId}
                      value={group.groupId}
                      className="mb-0 rounded-none border-0 border-b data-[state=open]:bg-transparent"
                    >
                      <AccordionTrigger className="-mx-2 min-w-0 gap-3 rounded-lg px-2 py-4 text-left text-base font-medium hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/30">
                        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                          {toSentenceCase(group.groupLabel)}
                          <SelectedChips names={groupSelectedNames} />
                        </span>
                        <SelectedCount
                          count={groupSelectedNames.length}
                          total={group.options.length}
                        />
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
