import { UniversalAccessIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { AccessibilityBadge } from "@/components/ui/accessibility-mark";
import { toSentenceCase } from "@/lib/listing-format";
import { cn } from "@/lib/utils";

function MoreChip({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <AccessibilityBadge icon={false} className={cn("shrink-0", className)}>
      <span className="sr-only">and </span>+{count}
      <span className="sr-only"> more</span>
    </AccessibilityBadge>
  );
}

/**
 * The access symbol once, then a listing's accessibility features as chips and the rest as a "+2"
 * chip. The row never wraps, so every card's chip row is the same height. A container query
 * decides how many names fit: one on a narrow card, two once the row is 26rem wide, so a second
 * name is never cut down to a few letters. Listings with none get a muted pill in the same place.
 */
export function AccessibilityChips({
  features,
  className,
}: {
  features: string[];
  className?: string;
}) {
  const [first, second] = features;
  return (
    <div className={cn("@container min-w-0", className)}>
      <div className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden">
        <HugeiconsIcon
          icon={UniversalAccessIcon}
          strokeWidth={2}
          aria-hidden
          className={cn(
            "size-4 shrink-0",
            first === undefined ? "text-muted-foreground" : "text-foreground",
          )}
        />
        {first === undefined ? (
          <AccessibilityBadge empty icon={false}>
            No accessibility info
          </AccessibilityBadge>
        ) : (
          <>
            <AccessibilityBadge icon={false} className="min-w-0">
              {toSentenceCase(first)}
            </AccessibilityBadge>
            {second !== undefined && (
              <AccessibilityBadge icon={false} className="hidden shrink-0 @[26rem]:inline-flex">
                {toSentenceCase(second)}
              </AccessibilityBadge>
            )}
            <MoreChip count={features.length - 1} className="@[26rem]:hidden" />
            <MoreChip count={features.length - 2} className="hidden @[26rem]:inline-flex" />
          </>
        )}
      </div>
    </div>
  );
}
