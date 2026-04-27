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
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value ?? undefined}
              value={field.value ?? undefined}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${def.displayName.toLowerCase()}`} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {def.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {def.helpText && <FormDescription>{def.helpText}</FormDescription>}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (def.fieldType === "textarea") {
    return (
      <FormField
        control={control}
        name={def.key}
        render={({ field }) => (
          <FormItem className={def.colSpan === 2 ? "md:col-span-2" : undefined}>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Textarea placeholder={def.placeholder} rows={4} {...field} />
            </FormControl>
            {def.helpText && <FormDescription>{def.helpText}</FormDescription>}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (def.fieldType === "number") {
    const isRent = def.key === "monthlyRentCents";
    return (
      <FormField
        control={control}
        name={def.key}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={0}
                step={def.key === "bathrooms" ? 0.5 : undefined}
                placeholder={def.placeholder}
                {...(isRent
                  ? {
                      value: typeof field.value === "number" ? field.value / 100 : "",
                      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                        const val = e.target.value;
                        field.onChange(val === "" ? undefined : Number(val) * 100);
                      },
                    }
                  : {
                      value: typeof field.value === "number" ? field.value : "",
                      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                        const val = e.target.value;
                        field.onChange(val === "" ? undefined : Number(val));
                      },
                    })}
              />
            </FormControl>
            {def.helpText && <FormDescription>{def.helpText}</FormDescription>}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  const inputType = def.fieldType === "email" ? "email" : def.fieldType === "tel" ? "tel" : "text";

  return (
    <FormField
      control={control}
      name={def.key}
      render={({ field }) => (
        <FormItem>
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
      {fieldsByCategory.map((cat, index) => (
        <FormSection
          key={cat.key}
          isSeparated={index > 0}
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
