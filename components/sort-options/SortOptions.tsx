import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type SortOptions = {
  value: string;
  label: string;
};
export function SortOptions({
  sortOptions,
  onChange,
  value,
  className,
}: {
  sortOptions: SortOptions[];
  onChange: (value: string) => void;
  value?: string;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label="Sort listings"
        className={cn("h-11 w-auto gap-1.5 md:h-10", className)}
      >
        <span className="text-muted-foreground">Sort:</span>
        <SelectValue placeholder="Newest" />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        <SelectGroup>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} id={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
