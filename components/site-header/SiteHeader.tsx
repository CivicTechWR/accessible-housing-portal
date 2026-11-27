import Link from "next/link";

import { BrandMark } from "@/components/brand/BrandMark";
import { HeaderAccountMenu } from "@/components/site-header/HeaderAccountMenu";
import { HeaderMobileMenu } from "@/components/site-header/HeaderMobileMenu";
import { HeaderNavLink } from "@/components/site-header/HeaderNavLink";
import { HeaderSignInButton } from "@/components/site-header/HeaderSignInButton";
import { ThemeToggle } from "@/components/theme-toggle/ThemeToggle";
import { getOptionalSession } from "@/lib/auth/session";
import { siteConfig } from "@/lib/site-config";

export async function SiteHeader() {
  const optionalSession = await getOptionalSession();
  const session = optionalSession.session;
  const isSignedIn = Boolean(session?.user);
  const role = optionalSession.authzUser?.role;
  const canCreateListing = role === "admin" || role === "partner";

  return (
    <header className="shrink-0 border-b bg-background">
      <div className="flex h-16 w-full items-center gap-6 px-4 sm:px-6">
        <Link
          href="/"
          className="-mx-1 flex items-center gap-2.5 rounded-lg px-1 text-lg font-semibold tracking-tight text-foreground"
        >
          <BrandMark />
          {siteConfig.name}
        </Link>

        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 lg:flex">
          {isSignedIn ? <HeaderNavLink href="/listings">Browse listings</HeaderNavLink> : null}
          {canCreateListing ? <HeaderNavLink href="/my-listings">My listings</HeaderNavLink> : null}
          {role === "admin" ? (
            <>
              <HeaderNavLink href="/admin/users">Users</HeaderNavLink>
              <HeaderNavLink href="/admin/custom-listing-fields">Custom fields</HeaderNavLink>
            </>
          ) : null}
        </nav>

        <div className="ml-auto hidden items-center gap-3 lg:flex">
          {isSignedIn ? (
            session?.user ? (
              <HeaderAccountMenu user={session.user} />
            ) : null
          ) : (
            <>
              {/* Signed-in users find the theme control in the account menu. */}
              <ThemeToggle />
              <HeaderSignInButton />
            </>
          )}
        </div>

        <HeaderMobileMenu
          isSignedIn={isSignedIn}
          isAdmin={role === "admin"}
          canCreateListing={canCreateListing}
          user={session?.user ?? null}
        />
      </div>
    </header>
  );
}
