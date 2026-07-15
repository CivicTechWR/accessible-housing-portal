"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { signOutFromHeader } from "@/components/site-header/actions";

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
  const menuId = useId();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className="absolute right-0 lg:hidden">
      <button
        type="button"
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-primary-foreground/16 text-primary-foreground transition-colors hover:bg-primary-foreground/24"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="sr-only">{isOpen ? "Close navigation menu" : "Open navigation menu"}</span>
        <span className="flex flex-col gap-1">
          <span className="block h-0.5 w-4 rounded-full bg-current" />
          <span className="block h-0.5 w-4 rounded-full bg-current" />
          <span className="block h-0.5 w-4 rounded-full bg-current" />
        </span>
      </button>

      {isOpen ? (
        <div
          id={menuId}
          className="absolute right-0 top-[calc(100%+0.75rem)] z-20 w-[min(18rem,calc(100vw-2rem))] rounded-3xl border border-primary-foreground/15 bg-primary p-3 shadow-xl shadow-slate-950/20"
        >
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
                  <span>Manage Account</span>
                </Link>

                <form action={signOutFromHeader}>
                  <button
                    type="submit"
                    className={mobileMenuItemClass}
                  >
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
          </nav>
        </div>
      ) : null}
    </div>
  );
}
