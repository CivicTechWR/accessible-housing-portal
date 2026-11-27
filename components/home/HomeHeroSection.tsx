import Link from "next/link";

import { HomeExampleListing } from "@/components/home/HomeExampleListing";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

/**
 * A full-width signage-blue band, like a wayfinding sign, with an example of what a listing looks
 * like beside the headline, so the first screen shows the product rather than describing it.
 */
export function HomeHeroSection() {
  return (
    <section
      aria-labelledby="home-title"
      className="bg-primary px-4 pt-8 pb-10 text-primary-foreground sm:px-6 sm:py-16 lg:py-20 dark:bg-[#123f86]"
    >
      <div className="mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_28rem] lg:gap-12">
        <div>
          <h1
            id="home-title"
            className="text-[1.875rem] leading-[1.1] font-bold tracking-[-0.03em] sm:text-[3.25rem] sm:leading-[1.05]"
          >
            Affordable, accessible rentals in {siteConfig.region}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-white sm:mt-5 sm:text-xl">
            Listings for housing navigators, with the accessibility details that matter.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 bg-white px-6 text-primary hover:bg-white/90 dark:bg-white dark:text-[#123f86] dark:hover:bg-white/90"
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
        </div>
        <HomeExampleListing />
      </div>
    </section>
  );
}
