"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type HeaderNavLinkProps = {
  href: string;
  children: ReactNode;
  /** Other paths that belong to this section, such as /admin/invite for Users. */
  alsoActiveFor?: string[];
};

export function HeaderNavLink({ href, children, alsoActiveFor = [] }: HeaderNavLinkProps) {
  const pathname = usePathname();
  const isActive = [href, ...alsoActiveFor].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        // The link fills the header's height so the current page's bar sits on the header's bottom edge.
        "relative inline-flex h-16 items-center px-3 text-[0.9375rem] font-medium text-muted-foreground transition-colors hover:text-foreground",
        "after:absolute after:inset-x-3 after:-bottom-px after:h-[3px] after:rounded-t-sm after:bg-transparent hover:after:bg-border",
        isActive &&
          "text-foreground after:bg-primary hover:after:bg-primary dark:after:bg-primary-text",
      )}
    >
      {children}
    </Link>
  );
}
