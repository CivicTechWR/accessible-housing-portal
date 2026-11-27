import { cn } from "@/lib/utils";

/** The house-and-ramp mark from app/icon.svg, drawn inline so it follows the theme. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d="M16 4l10 10v14H6V14z M16 14v8h6v-8z" className="fill-primary-foreground" />
      <path d="M4 28l12-6h12v6z" className="fill-signal" />
    </svg>
  );
}
