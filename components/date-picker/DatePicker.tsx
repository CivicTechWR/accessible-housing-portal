import { useId } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldLabel } from "@/components/ui/field";
import { Calendar01FreeIcons } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export interface DatePickerProps {
  selected?: Date;
  onSelect: (date?: Date) => void;
  formattedText: string;
}

export function DatePicker({ selected, onSelect, formattedText }: DatePickerProps) {
  const labelId = useId();
  const valueId = useId();

  return (
    <Field>
      <FieldLabel id={labelId} className="font-medium leading-none">
        Move-In Date
      </FieldLabel>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            // Read as "Move-In Date, Any date" so the button isn't announced without a name.
            aria-labelledby={`${labelId} ${valueId}`}
            className="w-full justify-start text-left font-normal max-sm:h-10 max-sm:text-sm"
          >
            <HugeiconsIcon icon={Calendar01FreeIcons} strokeWidth={2} />
            <span id={valueId} className={formattedText ? undefined : "text-muted-foreground"}>
              {formattedText || "Any date"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" selected={selected} onSelect={onSelect} />
        </PopoverContent>
      </Popover>
    </Field>
  );
}
