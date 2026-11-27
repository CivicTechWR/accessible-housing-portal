import Link from "next/link";

import { BrandMark } from "@/components/brand/BrandMark";
import { HeaderAccountMenu } from "@/components/site-header/HeaderAccountMenu";
import { HeaderMobileMenu } from "@/components/site-header/HeaderMobileMenu";
import { HeaderNavLink } from "@/components/site-header/HeaderNavLink";
import { HeaderSignInButton } from "@/components/site-header/HeaderSignInButton";
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
      <div className="site-container flex h-16 items-center gap-6">
        <Link
          href="/"
          className="-mx-1 flex items-center gap-2.5 rounded-lg px-1 text-lg font-bold tracking-[-0.02em] text-foreground"
        >
          <BrandMark />
          {siteConfig.name}
        </Link>

        {isSignedIn ? (
          <nav aria-label="Main" className="hidden flex-1 items-center gap-1 self-stretch lg:flex">
            <HeaderNavLink href="/listings">Browse listings</HeaderNavLink>
            {canCreateListing ? (
              <HeaderNavLink href="/my-listings" alsoActiveFor={["/listing-form"]}>
                My listings
              </HeaderNavLink>
            ) : null}
            {role === "admin" ? (
              <>
                <HeaderNavLink href="/admin/users" alsoActiveFor={["/admin/invite"]}>
                  Users
                </HeaderNavLink>
                <HeaderNavLink href="/admin/custom-listing-fields">Custom fields</HeaderNavLink>
              </>
            ) : null}
          </nav>
        ) : null}

        {isSignedIn ? (
          <>
            <div className="ml-auto hidden items-center gap-3 lg:flex">
              {session?.user ? <HeaderAccountMenu user={session.user} /> : null}
            </div>
            <HeaderMobileMenu
              isAdmin={role === "admin"}
              canCreateListing={canCreateListing}
              user={session?.user ?? null}
            />
          </>
        ) : (
          // Signed out, the only destination is sign-in, so phones get the same button as desktop
          // instead of a menu holding one link.
          <div className="ml-auto flex items-center">
            <HeaderSignInButton />
          </div>
        )}
      </div>
    </header>
  );
}
