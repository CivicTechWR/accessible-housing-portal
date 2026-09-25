import { cn } from "@/lib/utils";
import { Field, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

export interface PriceRangeInputProps {
  min?: number;
  max?: number;
  step?: number;
  onMinChange: (min: number | undefined) => Promise<void>;
  onMaxChange: (max: number | undefined) => Promise<void>;
  className?: string;
  fieldClassName?: string;
  labelClassName?: string;
}

/** Whole, non-negative dollars; undefined when the input is empty or not a number. */
function parsePriceInput(value: string) {
  const parsedValue = Number.parseInt(value, 10);

  return Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : undefined;
}

export function PriceRangeInput({
  min,
  max,
  step,
  onMinChange,
  onMaxChange,
  className,
  fieldClassName,
  labelClassName,
}: PriceRangeInputProps) {
  const [minInputValue, setMinInputValue] = useState(min?.toString() ?? "");
  const [maxInputValue, setMaxInputValue] = useState(max?.toString() ?? "");

  useEffect(() => {
    setMinInputValue(min?.toString() ?? "");
  }, [min]);

  useEffect(() => {
    setMaxInputValue(max?.toString() ?? "");
  }, [max]);

  return (
    <FieldSet className={cn("flex-row", className)}>
      <Field className={fieldClassName}>
        <FieldLabel className={labelClassName}>Min Price</FieldLabel>
        <Input
          min={0}
          type="number"
          step={step}
          value={minInputValue}
          placeholder="Min"
          onChange={(e) => {
            const price = parsePriceInput(e.target.value);

            setMinInputValue(price?.toString() ?? "");
            void onMinChange(price);
          }}
        />
      </Field>

      <Field className={fieldClassName}>
        <FieldLabel className={labelClassName}>Max Price</FieldLabel>

        <Input
          min={0}
          type="number"
          step={step}
          value={maxInputValue}
          placeholder="Max"
          onChange={(e) => {
            const price = parsePriceInput(e.target.value);

            setMaxInputValue(price?.toString() ?? "");
            void onMaxChange(price);
          }}
        />
      </Field>
    </FieldSet>
  );
}
