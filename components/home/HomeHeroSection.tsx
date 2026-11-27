import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

export function HomeHeroSection() {
  return (
    <section
      aria-labelledby="home-title"
      className="relative isolate flex min-h-[560px] items-end overflow-hidden bg-muted sm:min-h-[620px]"
    >
      {/* object-cover stretches this 3069x1722 photo to the hero's height, making it wider than
          a phone screen, so 100vw alone would fetch a copy too small and blurry. Update if the
          photo's aspect ratio or the hero height changes. */}
      <Image
        src="/home-hero.webp"
        alt=""
        fill
        preload
        sizes="(max-aspect-ratio: 116/100) 116vh, 100vw"
        className="-z-10 object-cover"
      />
      {/* Keeps at least 70% black behind every line of text however it wraps, so white text
          meets WCAG AA over any part of the photo, then fades out above the heading. */}
      <div className="w-full bg-[linear-gradient(to_top,rgb(0_0_0/0.8),rgb(0_0_0/0.7)_calc(100%_-_10rem),transparent)] pt-40">
        <div className="mx-auto max-w-6xl px-4 pb-14 text-white sm:px-6 sm:pb-20">
          <p className="mb-4 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur-sm">
            Invitation-only pilot in {siteConfig.region}
          </p>
          <h1 id="home-title" className="max-w-3xl text-4xl leading-[1.1] sm:text-6xl">
            Affordable, accessible rentals in {siteConfig.region}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/90 sm:text-xl">
            One place for housing navigators to find units from values-aligned providers, with the
            accessibility details that matter.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-white text-neutral-950 hover:bg-white/90">
              <Link href="/sign-in">Sign in to browse listings</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/60 bg-transparent text-white hover:bg-white/10 hover:text-white dark:bg-transparent dark:hover:bg-white/10"
            >
              <a href={`mailto:${siteConfig.contactEmail}`}>Request access</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
