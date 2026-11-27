import Link from "next/link";

import { HomeExampleListing } from "@/components/home/HomeExampleListing";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

/**
 * The headline sits on a blue panel styled like a wayfinding sign, beside an example of what a
 * listing looks like, so the first screen shows the product rather than describing it.
 */
export function HomeHeroSection() {
  return (
    <section
      aria-labelledby="home-title"
      className="border-b bg-muted/70 px-4 py-10 sm:px-6 sm:py-16 lg:py-20"
    >
      <div className="mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <div className="rounded-xl bg-primary px-6 pt-7 pb-8 text-primary-foreground sm:px-10 sm:pt-10 sm:pb-10 dark:bg-[#17478f]">
          <h1
            id="home-title"
            className="text-[2.125rem] leading-[1.05] font-bold tracking-[-0.03em] sm:text-[3.25rem]"
          >
            Affordable, accessible rentals in {siteConfig.region}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-white sm:text-xl">
            One place for housing navigators to find units from values-aligned providers, with the
            accessibility details that matter.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 bg-white px-6 text-primary hover:bg-white/90 dark:bg-white dark:text-[#17478f] dark:hover:bg-white/90"
            >
              <Link href="/sign-in">Sign in to browse listings</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 border-white/80 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white dark:border-white/80 dark:bg-transparent dark:hover:bg-white/10"
            >
              <a href={`mailto:${siteConfig.contactEmail}`}>Request access</a>
            </Button>
          </div>
          <p className="mt-6 text-base text-white/85">
            Invitation-only while we pilot in {siteConfig.region}.
          </p>
        </div>
        <HomeExampleListing />
      </div>
    </section>
  );
}
