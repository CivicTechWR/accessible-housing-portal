import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "neutral";

const dotClasses: Record<StatusTone, string> = {
  success: "bg-emerald-600 dark:bg-emerald-400",
  warning: "bg-amber-500 dark:bg-amber-400",
  danger: "bg-destructive",
  neutral: "bg-muted-foreground/60",
};

/** A status as a coloured dot and plain text, so the colour adds to the word instead of replacing it. */
export function StatusDot({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-sm whitespace-nowrap",
        tone === "neutral" ? "text-muted-foreground" : "text-foreground",
        className,
      )}
    >
      <span aria-hidden className={cn("size-2 shrink-0 rounded-full", dotClasses[tone])} />
      {children}
    </span>
  );
}
