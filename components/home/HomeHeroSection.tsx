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
      {/* Darkens only the lower part of the image, behind the text. */}
      <div className="absolute inset-0 -z-10 bg-linear-to-t from-black/75 via-black/30 to-transparent" />

      <div className="mx-auto w-full max-w-5xl px-6 pt-32 pb-12 text-white">
        <h1 id="home-title" className="max-w-3xl text-4xl sm:text-5xl">
          Affordable, accessible rentals in Waterloo Region
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-white/85">
          Connecting affordable, accessible housing seekers with the providers who serve them.
        </p>
        <Button asChild size="lg" className="mt-6 h-10 px-4 text-sm">
          <a href="#join">Request access</a>
        </Button>
      </div>
    </section>
  );
}
