"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { usePathname } from "next/navigation";

import { signOutFromHeader } from "@/components/site-header/actions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type HeaderAccountMenuProps = {
  user: {
    email?: string | null;
    name?: string | null;
  } | null;
};

const triggerClass =
  "inline-flex max-w-56 cursor-pointer items-center gap-1.5 rounded-full bg-primary-foreground/20 px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-foreground/30";

const menuItemClass =
  "flex w-full items-center rounded-2xl px-3 py-2 text-left text-sm font-medium transition-colors";

export function HeaderAccountMenu({ user }: HeaderAccountMenuProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const accountLabel = user?.name ?? user?.email ?? "Account";

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label="Open account menu"
          className={cn(triggerClass, isOpen && "bg-primary-foreground/30")}
        >
          <HugeiconsIcon icon={UserIcon} strokeWidth={2} size={16} />
          <span className="truncate">{accountLabel}</span>
          <span
            aria-hidden="true"
            className={cn(
              "mb-0.5 size-2.5 rotate-45 border-r-2 border-b-2 border-current transition-transform",
              isOpen ? "translate-y-0.5 rotate-[225deg]" : "-translate-y-px",
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={10} className="w-60 gap-2 p-1.5">
        <Link
          href="/manage-account"
          className={cn(menuItemClass, "text-foreground hover:bg-muted")}
          onClick={() => setIsOpen(false)}
        >
          Manage Account
        </Link>

        <form action={signOutFromHeader}>
          <button
            type="submit"
            className={cn(menuItemClass, "text-foreground hover:bg-muted")}
            onClick={() => setIsOpen(false)}
          >
            Sign out
          </button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
