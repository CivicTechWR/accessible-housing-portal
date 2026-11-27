import { WheelchairIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";

/*
 * Accessibility information is marked in tactile yellow, the yellow of tactile paving at curbs and
 * transit platforms. Yellow is reserved for this: actions and links stay blue.
 */

/** The wheelchair symbol on a yellow square, like an accessibility sign. Decorative. */
export function AccessibilityMark({
  size = "default",
  className,
}: {
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center bg-signal text-signal-foreground",
        size === "sm" && "size-5 rounded-[4px] [&>svg]:size-3.5",
        size === "default" && "size-7 rounded-md [&>svg]:size-[18px]",
        size === "lg" && "size-10 rounded-lg [&>svg]:size-6",
        className,
      )}
    >
      <HugeiconsIcon icon={WheelchairIcon} strokeWidth={2.25} />
    </span>
  );
}

/**
 * A yellow pill naming accessibility information, such as "Barrier-free entrance +2". With
 * `empty`, a muted pill of the same size for listings with nothing listed.
 */
export function AccessibilityBadge({
  children,
  empty = false,
  className,
}: {
  children: React.ReactNode;
  empty?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-md px-2 text-sm font-medium",
        empty ? "bg-muted text-muted-foreground" : "bg-signal text-signal-foreground",
        className,
      )}
    >
      <HugeiconsIcon
        icon={WheelchairIcon}
        strokeWidth={2.25}
        className="size-4 shrink-0"
        aria-hidden
      />
      <span className="truncate">{children}</span>
    </span>
  );
}
