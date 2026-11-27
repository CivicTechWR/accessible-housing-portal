import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** A full-width section of the home page with its content in the page column. */
export function HomeBand({
  children,
  tone = "plain",
}: {
  children: ReactNode;
  tone?: "plain" | "muted" | "sign";
}) {
  return (
    <div
      className={cn(
        "px-4 py-16 sm:px-6 sm:py-24",
        tone === "muted" && "bg-muted/60",
        tone === "sign" && "bg-primary text-primary-foreground dark:bg-[#17478f]",
      )}
    >
      <div className="mx-auto max-w-5xl">{children}</div>
    </div>
  );
}
