import Link from "next/link";

import { HeaderAccountMenu } from "@/components/site-header/HeaderAccountMenu";
import { HeaderMobileMenu } from "@/components/site-header/HeaderMobileMenu";
import { HeaderNavLink } from "@/components/site-header/HeaderNavLink";
import { getOptionalSession } from "@/lib/auth/session";

export async function SiteHeader() {
  const optionalSession = await getOptionalSession();
  const session = optionalSession.session;
  const isSignedIn = Boolean(session?.user);
  const canCreateListing =
    optionalSession.authzUser?.role === "admin" || optionalSession.authzUser?.role === "partner";
  const navPillClass =
    "rounded-full bg-primary-foreground/20 px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-foreground/30";
  const navPillActiveClass = "bg-primary-foreground/35 ring-1 ring-primary-foreground/60";

  return (
    <header data-site-header="true" className="bg-primary text-primary-foreground shrink-0">
      <div className="w-full px-4 sm:px-6">
        <div className="relative flex min-h-14 items-center justify-center py-2">
          <Link href="/" className="text-lg font-semibold tracking-tight text-primary-foreground">
            WR Housing Bridge
          </Link>

          <nav className="absolute right-0 hidden items-center gap-2 lg:flex">
            {isSignedIn ? (
              <>
                {canCreateListing ? (
                  <>
                    <HeaderNavLink
                      href="/my-listings"
                      className={navPillClass}
                      activeClassName={navPillActiveClass}
                    >
                      My Listings
                    </HeaderNavLink>
                  </>
                ) : null}

                {optionalSession.authzUser?.role === "admin" ? (
                  <>
                    <HeaderNavLink
                      href="/admin/custom-listing-fields"
                      className={navPillClass}
                      activeClassName={navPillActiveClass}
                    >
                      Custom Fields
                    </HeaderNavLink>
                    <HeaderNavLink
                      href="/admin/users"
                      className={navPillClass}
                      activeClassName={navPillActiveClass}
                    >
                      Manage Users
                    </HeaderNavLink>
                  </>
                ) : null}

                {session?.user ? <HeaderAccountMenu user={session.user} /> : null}
              </>
            ) : (
              <HeaderNavLink
                href="/sign-in"
                className={navPillClass}
                activeClassName={navPillActiveClass}
              >
                Sign in
              </HeaderNavLink>
            )}
          </nav>

          <HeaderMobileMenu
            isSignedIn={isSignedIn}
            isAdmin={optionalSession.authzUser?.role === "admin"}
            canCreateListing={canCreateListing}
            user={session?.user ?? null}
          />
        </div>
      </div>
    </header>
  );
}
