import { AccessibilityBadge } from "@/components/ui/accessibility-mark";
import { toSentenceCase } from "@/lib/listing-format";
import { cn } from "@/lib/utils";

/**
 * A listing's first accessibility feature as a chip, then "+2 more" as plain text, on one line at
 * every width. Listings with none get the muted pill of the same height, so every card has the
 * same structure.
 */
export function AccessibilityChips({
  features,
  className,
}: {
  features: string[];
  className?: string;
}) {
  const [first] = features;
  if (first === undefined) {
    return (
      <div className={cn("flex min-w-0", className)}>
        <AccessibilityBadge empty>No accessibility info</AccessibilityBadge>
      </div>
    );
  }

  const more = features.length - 1;
  return (
    <div className={cn("flex min-w-0 items-center gap-1.5", className)}>
      <AccessibilityBadge className="min-w-0">{toSentenceCase(first)}</AccessibilityBadge>
      {more > 0 && (
        <span className="shrink-0 text-sm whitespace-nowrap text-muted-foreground">
          +{more} more
        </span>
      )}
    </div>
  );
}
