import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { ComponentProps } from "react";
import { LabelledCheckbox } from "../labelled-checkbox/LabelledCheckbox";

export interface FilterOption {
  id: string;
  label: string;
  type: "boolean";
}

export interface DynamicFilterGroup {
  groupId: string;
  groupLabel: string;
  options: FilterOption[];
}

export interface FeatureAccordionProps {
  groups: DynamicFilterGroup[];
  getCheckboxProps: (id: string) => ComponentProps<typeof Checkbox>;
}

export function FeatureAccordion({ groups, getCheckboxProps }: FeatureAccordionProps) {
  if (!groups || groups.length === 0) return null;

  return (
    <Accordion type="multiple" className="w-full">
      {groups.map((group) => (
        <AccordionItem key={group.groupId} value={group.groupId}>
          <AccordionTrigger className="text-sm font-semibold hover:no-underline">
            {group.groupLabel}
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-4 pt-2">
              {group.options.map((option) => (
                <LabelledCheckbox
                  key={option.id}
                  label={option.label}
                  {...getCheckboxProps(option.id)}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
