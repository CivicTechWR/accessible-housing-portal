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
        "inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        isActive && "bg-muted text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
