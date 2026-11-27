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
import { formatNumberInput, parseNumberInput, stripLeadingZeros } from "./numberInput";

export interface ListingFormFieldsProps {
  control: ListingFormControl;
}

function FieldRenderer({
  def,
  control,
}: {
  def: CoreFieldDefinition;
  control: ListingFormControl;
}) {
  const label = `${def.displayName}${def.isRequired ? " *" : ""}`;

  if (def.fieldType === "select") {
    return (
      <FormField
        control={control}
        name={def.key}
        render={({ field }) => (
          <FormItem
            className={def.colSpan === 2 ? "md:col-span-2 min-w-0" : undefined}
            data-field-name={def.key}
          >
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
                <SelectTrigger className="max-w-full min-w-0">
                  <SelectValue placeholder={`Select ${def.displayName.toLowerCase()}`} />
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
            <FormItem
              className={def.colSpan === 2 ? "md:col-span-2" : undefined}
              data-field-name={def.key}
            >
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
          <FormItem
            className={def.colSpan === 2 ? "md:col-span-2" : undefined}
            data-field-name={def.key}
          >
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={def.placeholder}
                rows={4}
                {...field}
                value={field.value ?? ""}
              />
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
          <FormItem data-field-name={def.key}>
            <div className="flex items-center gap-1">
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
                placeholder={def.placeholder}
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
        <FormItem
          className={def.colSpan === 2 ? "md:col-span-2" : undefined}
          data-field-name={def.key}
        >
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type={inputType}
              placeholder={def.placeholder}
              {...field}
              value={field.value ?? ""}
            />
          </FormControl>
          {def.helpText && <FormDescription>{def.helpText}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function ListingFormFields({ control }: ListingFormFieldsProps) {
  const fieldsByCategory = CORE_FIELD_CATEGORIES.map((cat) => ({
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
          {cat.fields.map((def) => (
            <FieldRenderer key={def.key} def={def} control={control} />
          ))}
        </FormSection>
      ))}
    </>
  );
}
