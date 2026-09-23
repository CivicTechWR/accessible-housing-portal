import { Checkbox } from "@/components/ui/checkbox";
import { ComponentProps } from "react";

export interface LabelledCheckboxProps extends ComponentProps<typeof Checkbox> {
  label: string;
}

export function LabelledCheckbox({ label, id, ...checkboxProps }: LabelledCheckboxProps) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox id={id} {...checkboxProps} />
      <label
        htmlFor={id}
        className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
      </label>
    </div>
  );
}
