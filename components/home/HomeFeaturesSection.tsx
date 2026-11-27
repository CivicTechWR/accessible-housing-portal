import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";

import { AccessibilityMark } from "@/components/ui/accessibility-mark";
import { formatRent, formatRooms, RENT_PERIOD } from "@/lib/listing-format";

const features = [
  {
    title: "Accessibility, item by item",
    body: "Barrier-free entrances, lowered counters, elevators and more, listed by the provider and searchable as filters.",
  },
  {
    title: "Rent and terms up front",
    body: "Monthly rent, deposit, utilities, lease term and the forms of income a landlord accepts, before anyone picks up the phone.",
  },
  {
    title: "On a map, with transit",
    body: "See every unit on one map, with Walk Score® and transit ratings where they're available.",
  },
];

const exampleFeatures = [
  "Barrier-free main entrance",
  "Elevator in building",
  "Lowered kitchen counters",
];

/** A made-up listing that shows what a real one looks like. */
function ExampleListing() {
  return (
    <figure className="overflow-hidden rounded-xl border bg-card shadow-xl shadow-black/8 dark:shadow-black/40">
      <div className="relative aspect-[3/2]">
        <Image
          // A different photo from the hero, so the example reads as a listing rather than a repeat.
          src="https://images.pexels.com/photos/7746646/pexels-photo-7746646.jpeg?cs=srgb&fm=jpg"
          alt=""
          fill
          sizes="(min-width: 1024px) 420px, 100vw"
          className="object-cover"
        />
        <span className="absolute top-3 left-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
          Example listing
        </span>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-lg font-bold">Maple Court Apartments</p>
          <p className="shrink-0 text-lg font-bold">
            {formatRent(1450)}
            <span className="text-sm font-normal text-muted-foreground">{RENT_PERIOD}</span>
          </p>
        </div>
        <p className="-mt-3 text-sm text-muted-foreground">{formatRooms(1, 1, 620)}</p>
        <div className="border-t pt-4">
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <AccessibilityMark size="sm" />
            Accessibility
          </p>
          <ul role="list" className="mt-3 space-y-2">
            {exampleFeatures.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 text-base">
                <HugeiconsIcon
                  icon={Tick02Icon}
                  strokeWidth={2.5}
                  size={18}
                  aria-hidden="true"
                  className="shrink-0"
                />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <figcaption className="sr-only">
        An example of how a listing appears to navigators.
      </figcaption>
    </figure>
  );
}

export function HomeFeaturesSection() {
  return (
    <section
      aria-labelledby="features-title"
      className="grid items-center gap-12 lg:grid-cols-[1fr_420px] lg:gap-16"
    >
      <div>
        <h2 id="features-title" className="text-[1.75rem] sm:text-4xl">
          What every listing shows
        </h2>
        <ul role="list" className="mt-8 divide-y border-y">
          {features.map((feature) => (
            <li key={feature.title} className="py-5">
              <h3 className="text-lg">{feature.title}</h3>
              <p className="mt-1.5 max-w-xl text-base leading-relaxed">{feature.body}</p>
            </li>
          ))}
        </ul>
      </div>
      <ExampleListing />
    </section>
  );
}
