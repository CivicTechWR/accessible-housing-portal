import { ListingFormControl } from "@/app/listing-form/types";
import {
  CORE_FIELD_DEFINITIONS,
  CORE_FIELD_CATEGORIES,
  CoreFieldDefinition,
} from "@/app/listing-form/fieldDefinitions";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSection } from "@/components/listing-form-layout/ListingFormLayout";
import { listingFormSectionId } from "@/app/listing-form/fieldDefinitions";
import { LabelledCheckbox } from "@/components/labelled-checkbox/LabelledCheckbox";
import { InfoPopover } from "@/components/info-popover/InfoPopover";
import { HOUSING_DEFINITIONS } from "@/shared/housing-definitions";
import { cn } from "@/lib/utils";
import { formatNumberInput, parseNumberInput, stripLeadingZeros } from "./numberInput";

type CoreFieldCategoryKey = (typeof CORE_FIELD_CATEGORIES)[number]["key"];

export interface ListingFormFieldsProps {
  control: ListingFormControl;
  /** The sections to render, in their usual order. Defaults to every core section. */
  categories?: readonly CoreFieldCategoryKey[];
}

/** The field's columns in its section's two-column grid, or in its row of three. */
function fieldSpan(def: CoreFieldDefinition) {
  if (def.rowOfThree) return "col-span-1";
  // Links are too long to read in half of the form column beside the preview.
  if (def.colSpan === 2 || def.fieldType === "url") return "col-span-2";
  // An email pairs with the phone number after it from sm, so neither sits alone at half width.
  if (def.fieldType === "email" || def.fieldType === "tel") return "col-span-2 sm:col-span-1";
  return def.pairOnMobile ? "col-span-1" : "col-span-2 md:col-span-1";
}

function FieldRenderer({
  def,
  control,
}: {
  def: CoreFieldDefinition;
  control: ListingFormControl;
}) {
  // The asterisk stays in the accessible name ("Title *"), which the form's "* Required" note
  // explains, but reads quieter than the label.
  const label = (
    <>
      {def.displayName}
      {def.isRequired ? (
        <span className="-ml-1.5 font-normal text-muted-foreground"> *</span>
      ) : null}
    </>
  );

  if (def.fieldType === "select") {
    return (
      <FormField
        control={control}
        name={def.key}
        render={({ field }) => (
          <FormItem className={cn("min-w-0", fieldSpan(def))} data-field-name={def.key}>
            <FormLabel>{label}</FormLabel>
            <Select
              onValueChange={(value) => {
                // Radix's hidden native <select> echoes its pre-hydration empty value
                // after the edit form loads. No option is empty, so ignore that echo.
                if (value === "") {
                  return;
                }

                field.onChange(value);
              }}
              value={field.value ?? ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="max-w-[calc(100vw-2rem)]">
                {def.options?.map((opt) => (
                  <SelectItem className="pr-7" key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!def.isRequired && field.value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit"
                aria-label={`Clear ${def.displayName.toLowerCase()}`}
                onClick={() => field.onChange("")}
              >
                Clear
              </Button>
            )}
            {def.helpText && <FormDescription>{def.helpText}</FormDescription>}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (def.fieldType === "checkbox-group") {
    return (
      <FormField
        control={control}
        name={def.key}
        render={({ field }) => {
          const selected: string[] = Array.isArray(field.value) ? field.value : [];
          const toggleOption = (value: string, checked: boolean) => {
            const next = checked ? [...selected, value] : selected.filter((v) => v !== value);
            // Keep the stored order stable regardless of the order boxes were checked
            field.onChange(def.options.map((opt) => opt.value).filter((v) => next.includes(v)));
          };

          return (
            <FormItem className={fieldSpan(def)} data-field-name={def.key}>
              <FormLabel>{label}</FormLabel>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {def.options.map((opt) => (
                  <FormControl key={opt.value}>
                    <LabelledCheckbox
                      id={`${def.key}-${opt.value}`}
                      label={opt.label}
                      checked={selected.includes(opt.value)}
                      onCheckedChange={(checked) => toggleOption(opt.value, checked === true)}
                    />
                  </FormControl>
                ))}
              </div>
              {def.helpText && <FormDescription>{def.helpText}</FormDescription>}
              <FormMessage />
            </FormItem>
          );
        }}
      />
    );
  }

  if (def.fieldType === "textarea") {
    return (
      <FormField
        control={control}
        name={def.key}
        render={({ field }) => (
          <FormItem className={fieldSpan(def)} data-field-name={def.key}>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Textarea rows={4} {...field} value={field.value ?? ""} />
            </FormControl>
            {def.helpText && <FormDescription>{def.helpText}</FormDescription>}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (def.fieldType === "number") {
    // Rent is stored in cents but typed in dollars.
    const scale = def.key === "monthlyRentCents" ? 100 : 1;
    const isLeaseTerm = def.key === "leaseTerm";
    return (
      <FormField
        control={control}
        name={def.key}
        render={({ field }) => (
          <FormItem className={fieldSpan(def)} data-field-name={def.key}>
            {/* Fixed to the label's height so the info button doesn't push this field below the one beside it. */}
            <div className="flex h-5 items-center gap-1">
              <FormLabel>{label}</FormLabel>
              {isLeaseTerm && def.helpText && (
                <InfoPopover
                  label={HOUSING_DEFINITIONS.leaseTerm.label}
                  description={def.helpText}
                />
              )}
            </div>
            <FormControl>
              <Input
                type="number"
                min={def.key === "squareFeet" ? 1 : 0}
                step={def.key === "bathrooms" ? 0.5 : undefined}
                name={field.name}
                ref={field.ref}
                // Autosave only clears a stored optional number once its field is touched.
                onBlur={field.onBlur}
                value={formatNumberInput(field.value, scale)}
                onChange={(e) => {
                  const raw = e.target.value;
                  // Typing 2 after a 0 gives "02", which React leaves on screen because it
                  // equals the stored 2, so fix the text here. Only a stored 0 needs this:
                  // stripping every time would turn 1050 into 50 when the 1 is deleted.
                  const text = field.value === 0 ? stripLeadingZeros(raw) : raw;
                  if (text !== raw) {
                    e.target.value = text;
                  }
                  field.onChange(parseNumberInput(text, scale));
                }}
              />
            </FormControl>
            {def.helpText && (
              <FormDescription className={isLeaseTerm ? "sr-only" : undefined}>
                {def.helpText}
              </FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  const inputType =
    def.fieldType === "email"
      ? "email"
      : def.fieldType === "tel"
        ? "tel"
        : def.fieldType === "url"
          ? "url"
          : "text";

  return (
    <FormField
      control={control}
      name={def.key}
      render={({ field }) => (
        <FormItem className={fieldSpan(def)} data-field-name={def.key}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={inputType} {...field} value={field.value ?? ""} />
          </FormControl>
          {def.helpText && <FormDescription>{def.helpText}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** Collects consecutive `rowOfThree` fields into one array so they can share a row. */
function groupRowsOfThree(fields: CoreFieldDefinition[]) {
  const items: (CoreFieldDefinition | [CoreFieldDefinition, ...CoreFieldDefinition[]])[] = [];
  for (const def of fields) {
    const last = items.at(-1);
    if (def.rowOfThree && Array.isArray(last)) last.push(def);
    else items.push(def.rowOfThree ? [def] : def);
  }
  return items;
}

export function ListingFormFields({ control, categories }: ListingFormFieldsProps) {
  const shownCategories = CORE_FIELD_CATEGORIES.filter(
    (cat) => !categories || categories.includes(cat.key),
  );
  const fieldsByCategory = shownCategories.map((cat) => ({
    ...cat,
    fields: CORE_FIELD_DEFINITIONS.filter((f) => f.category === cat.key).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    ),
  }));

  return (
    <>
      {fieldsByCategory.map((cat) => (
        <FormSection
          key={cat.key}
          id={listingFormSectionId(cat.key)}
          title={cat.displayName}
          description={cat.description}
        >
          {groupRowsOfThree(cat.fields).map((item) =>
            Array.isArray(item) ? (
              <div
                key={item[0].key}
                className="col-span-2 grid grid-cols-3 gap-x-3 gap-y-5 sm:gap-x-4"
              >
                {item.map((def) => (
                  <FieldRenderer key={def.key} def={def} control={control} />
                ))}
              </div>
            ) : (
              <FieldRenderer key={item.key} def={item} control={control} />
            ),
          )}
        </FormSection>
      ))}
    </>
  );
}
