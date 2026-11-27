import { AccessibilityBadge } from "@/components/ui/accessibility-mark";
import { toSentenceCase } from "@/lib/listing-format";
import { cn } from "@/lib/utils";

function MoreCount({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span className={cn("shrink-0 text-sm whitespace-nowrap text-muted-foreground", className)}>
      +{count} more
    </span>
  );
}

/**
 * A listing's accessibility features as chips, then "+2 more" as plain text. Phones, where a card
 * spans the screen, name two features; from `sm` up the cards sit in columns, so one chip keeps
 * every card's row on one line. Only the first chip carries the wheelchair symbol. Listings with
 * none get the muted pill of the same height, so every card has the same structure.
 */
export function AccessibilityChips({
  features,
  className,
}: {
  features: string[];
  className?: string;
}) {
  const [first, second] = features;
  if (first === undefined) {
    return (
      <div className={cn("flex min-w-0", className)}>
        <AccessibilityBadge empty>No accessibility info</AccessibilityBadge>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1.5 sm:flex-nowrap",
        className,
      )}
    >
      <AccessibilityBadge>{toSentenceCase(first)}</AccessibilityBadge>
      {second && (
        <AccessibilityBadge icon={false} className="sm:hidden">
          {toSentenceCase(second)}
        </AccessibilityBadge>
      )}
      <MoreCount count={features.length - 2} className="sm:hidden" />
      <MoreCount count={features.length - 1} className="max-sm:hidden" />
    </div>
  );
}
