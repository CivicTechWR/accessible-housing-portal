import Image from "next/image";

import { Button } from "@/components/ui/button";

export function HomeHeroSection() {
  return (
    <section
      aria-labelledby="home-title"
      className="relative isolate flex min-h-[65vh] items-end overflow-hidden bg-muted"
    >
      {/* Placeholder until the final photo from #405. */}
      <Image
        src="/home-image-placeholder.svg"
        alt=""
        fill
        preload
        sizes="100vw"
        className="-z-10 object-cover dark:brightness-75"
      />
      {/* Keeps at least 55% black behind every line of text however it wraps, so white text
          meets WCAG AA over any photo, then fades out in the padding above the heading. */}
      <div className="w-full bg-[linear-gradient(to_top,rgb(0_0_0/0.75),rgb(0_0_0/0.55)_calc(100%_-_8rem),transparent)] pt-32">
        <div className="mx-auto max-w-5xl px-6 pb-12 text-white">
          <h1 id="home-title" className="max-w-3xl text-4xl sm:text-5xl">
            Affordable, accessible rentals in Waterloo Region
          </h1>
          <p className="mt-4 max-w-2xl text-lg">
            Connecting affordable, accessible housing seekers with the providers who serve them.
          </p>
          <Button asChild size="lg" className="mt-6 h-10 px-4 text-sm">
            <a href="#join">Request access</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
