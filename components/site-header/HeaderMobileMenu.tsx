"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { signOutFromHeader } from "@/components/site-header/actions";
import { ThemeToggle } from "@/components/theme-toggle/ThemeToggle";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/** The phone menu for signed-in people. Signed out, the header shows a Sign in button instead. */
type HeaderMobileMenuProps = {
  isAdmin: boolean;
  canCreateListing: boolean;
  user: {
    email?: string | null;
    name?: string | null;
  } | null;
};

const mobileMenuItemClass =
  "flex min-h-12 w-full items-center justify-between rounded-lg px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted";

export function HeaderMobileMenu({ isAdmin, canCreateListing, user }: HeaderMobileMenuProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className="ml-auto lg:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Open navigation menu"
            className="-mr-2 flex size-11 cursor-pointer items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
          >
            <span className="flex flex-col gap-1" aria-hidden="true">
              <span className="block h-0.5 w-4 rounded-full bg-current" />
              <span className="block h-0.5 w-4 rounded-full bg-current" />
              <span className="block h-0.5 w-4 rounded-full bg-current" />
            </span>
          </button>
        </SheetTrigger>

        <SheetContent
          side="right"
          onOpenAutoFocus={(event) => {
            // Start on the first menu item rather than
            // whatever Radix picks, which was the theme toggle.
            const first = navRef.current?.querySelector<HTMLElement>("a[href], button");
            if (first) {
              event.preventDefault();
              first.focus();
            }
          }}
          className="gap-4 bg-background p-4 pt-5 data-[side=right]:w-[min(20rem,calc(100vw-3rem))] [&>[data-slot=sheet-close]]:top-3 [&>[data-slot=sheet-close]]:right-3 [&>[data-slot=sheet-close]]:size-11 [&>[data-slot=sheet-close]]:rounded-lg [&>[data-slot=sheet-close]_svg]:size-5"
        >
          <SheetTitle className="px-3 text-lg font-bold">Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Site navigation and account options
          </SheetDescription>
          <nav ref={navRef} aria-label="Mobile navigation" className="space-y-1">
            <>
              <Link
                href="/listings"
                className={mobileMenuItemClass}
                onClick={() => setIsOpen(false)}
              >
                <span>Browse listings</span>
              </Link>
              {canCreateListing ? (
                <>
                  <Link
                    href="/my-listings"
                    className={mobileMenuItemClass}
                    onClick={() => setIsOpen(false)}
                  >
                    <span>My listings</span>
                  </Link>
                </>
              ) : null}

              {isAdmin ? (
                <>
                  <Link
                    href="/admin/custom-listing-fields"
                    className={mobileMenuItemClass}
                    onClick={() => setIsOpen(false)}
                  >
                    <span>Custom fields</span>
                  </Link>
                  <Link
                    href="/admin/users"
                    className={mobileMenuItemClass}
                    onClick={() => setIsOpen(false)}
                  >
                    <span>Users</span>
                  </Link>
                </>
              ) : null}

              {user ? (
                <div className="mt-3 flex items-center gap-3 border-t px-3 pt-4 pb-2 text-sm text-muted-foreground">
                  <HugeiconsIcon icon={UserIcon} strokeWidth={2} size={16} />
                  <span className="truncate font-medium">{user.name ?? user.email}</span>
                </div>
              ) : null}

              <Link
                href="/manage-account"
                className={mobileMenuItemClass}
                onClick={() => setIsOpen(false)}
              >
                Manage account
              </Link>
              <form action={signOutFromHeader}>
                <button type="submit" className={mobileMenuItemClass}>
                  <span>Sign out</span>
                </button>
              </form>
            </>

            <div className="mt-3 flex items-center justify-between border-t px-3 pt-4 text-base font-medium text-foreground">
              <span>Theme</span>
              <ThemeToggle />
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
