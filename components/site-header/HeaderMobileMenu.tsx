"use client";

import { useEffect, useState } from "react";
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

type HeaderMobileMenuProps = {
  isSignedIn: boolean;
  isAdmin: boolean;
  canCreateListing: boolean;
  user: {
    email?: string | null;
    name?: string | null;
  } | null;
};

const mobileMenuItemClass =
  "flex w-full items-center justify-between rounded-2xl bg-primary-foreground/10 px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-foreground/20";

export function HeaderMobileMenu({
  isSignedIn,
  isAdmin,
  canCreateListing,
  user,
}: HeaderMobileMenuProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className="absolute right-0 lg:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Open navigation menu"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-primary-foreground/16 text-primary-foreground transition-colors hover:bg-primary-foreground/24"
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
          className="w-[min(20rem,calc(100vw-3rem))] gap-4 border-primary-foreground/15 bg-primary p-4 pt-5 text-primary-foreground [&>[data-slot=sheet-close]]:text-primary-foreground [&>[data-slot=sheet-close]]:hover:bg-primary-foreground/20"
        >
          <SheetTitle className="text-base text-primary-foreground">Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Site navigation and account options
          </SheetDescription>
          <nav aria-label="Mobile navigation" className="space-y-2">
            {isSignedIn ? (
              <>
                {canCreateListing ? (
                  <>
                    <Link
                      href="/my-listings"
                      className={mobileMenuItemClass}
                      onClick={() => setIsOpen(false)}
                    >
                      <span>My Listings</span>
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
                      <span>Custom Fields</span>
                    </Link>
                    <Link
                      href="/admin/users"
                      className={mobileMenuItemClass}
                      onClick={() => setIsOpen(false)}
                    >
                      <span>Manage Users</span>
                    </Link>
                  </>
                ) : null}

                {user ? (
                  <div className="flex items-center gap-3 rounded-2xl bg-primary-foreground/10 px-4 py-3 text-sm text-primary-foreground/90">
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
            ) : (
              <Link
                href="/sign-in"
                className={mobileMenuItemClass}
                onClick={() => setIsOpen(false)}
              >
                <span>Sign in</span>
              </Link>
            )}

            <div className="flex items-center justify-between rounded-2xl bg-primary-foreground/10 px-4 py-3 text-sm font-medium text-primary-foreground">
              <span>Theme</span>
              <ThemeToggle />
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
