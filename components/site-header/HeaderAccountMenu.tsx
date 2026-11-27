"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDown01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { usePathname } from "next/navigation";

import { signOutFromHeader } from "@/components/site-header/actions";
import { ThemeToggle } from "@/components/theme-toggle/ThemeToggle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type HeaderAccountMenuProps = {
  user: {
    email?: string | null;
    name?: string | null;
  } | null;
};

const triggerClass =
  "inline-flex h-10 max-w-60 cursor-pointer items-center gap-2 rounded-full border border-border bg-background py-1 pr-3 pl-1 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-muted";

const menuItemClass =
  "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors";

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
          className={cn(triggerClass, isOpen && "bg-muted")}
        >
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary-text dark:bg-primary-text/15"
          >
            <HugeiconsIcon icon={UserIcon} strokeWidth={1.75} size={18} />
          </span>
          <span className="truncate">{accountLabel}</span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={1.75}
            size={16}
            aria-hidden="true"
            className={cn("text-muted-foreground transition-transform", isOpen && "rotate-180")}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={10} className="w-60 gap-2 p-1.5">
        <Link
          href="/manage-account"
          className={cn(menuItemClass, "text-foreground hover:bg-muted")}
        >
          Manage account
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

        <div className="flex items-center justify-between border-t border-border px-3 pt-2 pb-1 text-sm font-medium text-foreground">
          <span>Theme</span>
          <ThemeToggle />
        </div>
      </PopoverContent>
    </Popover>
  );
}
