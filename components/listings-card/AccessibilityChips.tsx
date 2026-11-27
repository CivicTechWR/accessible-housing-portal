import { AccessibilityBadge } from "@/components/ui/accessibility-mark";
import { toSentenceCase } from "@/lib/listing-format";
import { cn } from "@/lib/utils";

/** How many features a card names before the rest collapse into a "+2" chip. */
const NAMED_CHIPS = 2;

/**
 * A listing's first two accessibility features as chips, then the rest as a "+2" chip. On a narrow
 * card the row wraps onto a second line rather than cutting a name short. Listings with none get
 * the muted pill of the same height, so every card has the same structure.
 */
export function AccessibilityChips({
  features,
  className,
}: {
  features: string[];
  className?: string;
}) {
  if (features.length === 0) {
    return (
      <div className={cn("flex min-w-0", className)}>
        <AccessibilityBadge empty>No accessibility info</AccessibilityBadge>
      </div>
    );
  }

  const named = features.slice(0, NAMED_CHIPS);
  const more = features.length - named.length;
  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-1.5", className)}>
      {named.map((feature, index) => (
        <AccessibilityBadge key={feature} icon={index === 0} className="min-w-0">
          {toSentenceCase(feature)}
        </AccessibilityBadge>
      ))}
      {more > 0 && (
        <AccessibilityBadge icon={false} className="shrink-0">
          <span className="sr-only">and </span>+{more}
          <span className="sr-only"> more</span>
        </AccessibilityBadge>
      )}
    </div>
  );
}
