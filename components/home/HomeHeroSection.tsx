import Image from "next/image";

const heroImage = "/home-image-placeholder.svg";

export function HomeHeroSection() {
  return (
    <section
      aria-labelledby="home-hero-title"
      className="relative isolate flex min-h-[calc(100vh-56px)] items-end overflow-hidden bg-muted"
    >
      <div className="absolute inset-0">
        <Image
          src={heroImage}
          alt=""
          fill
          preload
          sizes="100vw"
          className="object-cover object-center brightness-90 saturate-75"
        />
        <div className="absolute inset-0 bg-linear-to-t from-background/95 via-background/75 to-background/30" />
      </div>

      <div className="relative z-10 w-full px-6 pb-10 pt-24 sm:px-10 sm:pb-14 lg:px-16">
        <p className="max-w-2xl text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
          Home Hub · Waterloo Region
        </p>
        <div className="max-w-2xl pt-3 text-foreground">
          <h1
            id="home-hero-title"
            className="mt-2 text-4xl font-semibold tracking-tight sm:text-6xl"
          >
            Find accessible housing with less friction
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Connecting affordable, accessible housing seekers with the providers who serve them.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#contact"
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 hover:bg-primary/80"
            >
              Request access
            </a>
            <a
              href="#about"
              className="rounded-full border border-border bg-background/60 px-5 py-2.5 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5 hover:bg-background/80"
            >
              About Home Hub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
