"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActivePath } from "@/components/site-header/nav-active";
import { cn } from "@/lib/utils";

type HeaderNavLinkProps = {
  href: string;
  className: string;
  activeClassName: string;
  children: ReactNode;
};

export function HeaderNavLink({ href, className, activeClassName, children }: HeaderNavLinkProps) {
  const pathname = usePathname();
  const isActive = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(className, isActive && activeClassName)}
    >
      {children}
    </Link>
  );
}
