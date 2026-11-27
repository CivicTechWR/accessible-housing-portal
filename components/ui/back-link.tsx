import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** The one style for "← Back to …" links above a page title. */
export function BackLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "-ml-1 inline-flex min-h-11 items-center gap-1.5 self-start rounded-md px-1 text-[0.9375rem] font-medium text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none",
        className,
      )}
    >
      <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" aria-hidden />
      {children}
    </Link>
  );
}
