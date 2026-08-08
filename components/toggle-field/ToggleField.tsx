import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Field, FieldLabel } from "@/components/ui/field";
import { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type ToggleFieldProps = {
  title?: string;
  description?: string;
  publicText?: string;
  options: {
    value: string;
    label: string;
  }[];
  value: string | undefined | null;
  onValueChange: (value: string) => void;
  allowEmpty?: boolean;
  variant?: ComponentProps<typeof ToggleGroup>["variant"];
  className?: string;
  titleWrapperClassName?: string;
  labelClassName?: string;
};

export function ToggleField({
  title,
  description,
  publicText,
  options,
  value,
  onValueChange,
  allowEmpty,
  variant,
  className,
  titleWrapperClassName,
  labelClassName,
}: ToggleFieldProps) {
  return (
    <Field className={className}>
      {title && (
        <div className={cn("mb-1 grid gap-1.5 leading-none", titleWrapperClassName)}>
          <FieldLabel className={cn("font-medium leading-none", labelClassName)}>
            {title}
          </FieldLabel>
          {description && (
            <p className="text-sm text-foreground whitespace-pre-line">{description}</p>
          )}
          {publicText && (
            <blockquote className="text-xs leading-snug text-foreground/75 whitespace-pre-line before:content-['“'] after:content-['”']">
              {publicText}
            </blockquote>
          )}
        </div>
      )}
      <ToggleGroup
        type="single"
        variant={variant}
        value={value ?? ""}
        onValueChange={(val) => {
          if (val) {
            onValueChange(val);
          } else if (allowEmpty) {
            onValueChange("");
          }
        }}
        className="justify-start"
      >
        {options.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value} className="border">
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
  );
}
