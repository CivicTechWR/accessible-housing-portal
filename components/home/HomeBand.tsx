import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** A full-width section of the home page with its content in the page column. */
export function HomeBand({
  children,
  tone = "plain",
  strip = false,
}: {
  children: ReactNode;
  tone?: "plain" | "card";
  /** The tactile strip along the band's top edge. */
  strip?: boolean;
}) {
  return (
    <>
      {strip ? <div aria-hidden className="tactile-strip h-2.5" /> : null}
      <div className={cn("px-4 py-16 sm:px-6 sm:py-24", tone === "card" && "border-y bg-card")}>
        <div className="mx-auto max-w-5xl">{children}</div>
      </div>
    </>
  );
}
