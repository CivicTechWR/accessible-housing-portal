import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

/**
 * The headline sits on a blue panel styled like a wayfinding sign, mounted over the photo on wide
 * screens and below it on phones. The panel is opaque, so text contrast doesn't depend on the photo.
 */
export function HomeHeroSection() {
  return (
    <section aria-labelledby="home-title" className="relative isolate bg-muted">
      <div className="relative h-56 sm:absolute sm:inset-0 sm:h-auto">
        {/* object-cover stretches this 3069x1722 photo to the hero's height, making it wider than
            a phone screen, so 100vw alone would fetch a copy too small and blurry. Update if the
            photo's aspect ratio or the hero height changes. */}
        <Image
          src="/home-hero.webp"
          alt=""
          fill
          preload
          sizes="(max-aspect-ratio: 116/100) 116vh, 100vw"
          className="object-cover dark:brightness-75"
        />
      </div>
      <div className="relative px-4 pb-10 sm:px-6 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="-mt-12 max-w-[40rem] overflow-hidden rounded-xl bg-primary text-primary-foreground shadow-2xl shadow-black/25 sm:mt-0 dark:bg-[#17478f]">
            <div className="px-6 pt-7 pb-8 sm:px-10 sm:pt-10 sm:pb-10">
              <h1
                id="home-title"
                className="text-[2.125rem] leading-[1.05] font-bold tracking-[-0.03em] sm:text-[3.5rem]"
              >
                Affordable, accessible rentals in {siteConfig.region}
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-white sm:text-xl">
                One place for housing navigators to find units from values-aligned providers, with
                the accessibility details that matter.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-6 bg-white text-primary hover:bg-white/90 dark:bg-white dark:text-[#17478f] dark:hover:bg-white/90"
                >
                  <Link href="/sign-in">Sign in to browse listings</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 px-6 border-white/80 bg-transparent text-white hover:bg-white/10 hover:text-white dark:border-white/80 dark:bg-transparent dark:hover:bg-white/10"
                >
                  <a href={`mailto:${siteConfig.contactEmail}`}>Request access</a>
                </Button>
              </div>
              <p className="mt-6 text-base text-white/85">
                Invitation-only while we pilot in {siteConfig.region}.
              </p>
            </div>
            <div aria-hidden className="tactile-strip h-4" />
          </div>
        </div>
      </div>
    </section>
  );
}
