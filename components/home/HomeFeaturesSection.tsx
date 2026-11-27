import {
  WheelchairIcon,
  CheckmarkCircle02Icon,
  DollarCircleIcon,
  MapsLocation01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";

import { formatRent, formatRooms, RENT_PERIOD } from "@/lib/listing-format";

const features = [
  {
    icon: WheelchairIcon,
    title: "Accessibility, item by item",
    body: "Barrier-free entrances, lowered counters, elevators and more, listed by the provider and searchable as filters.",
  },
  {
    icon: DollarCircleIcon,
    title: "Rent and terms up front",
    body: "Monthly rent, deposit, utilities, lease term and the forms of income a landlord accepts, before anyone picks up the phone.",
  },
  {
    icon: MapsLocation01Icon,
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
    <figure className="overflow-hidden rounded-2xl border bg-card shadow-lg shadow-black/5">
      <div className="relative aspect-[3/2]">
        <Image
          src="/home-hero.webp"
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
          <p className="text-lg font-semibold">Maple Court Apartments</p>
          <p className="shrink-0 text-lg font-semibold tabular-nums">
            {formatRent(1450)}
            <span className="text-sm font-normal text-muted-foreground">{RENT_PERIOD}</span>
          </p>
        </div>
        <p className="-mt-3 text-sm text-muted-foreground">{formatRooms(1, 1, 620)}</p>
        <ul role="list" className="space-y-2 border-t pt-4">
          {exampleFeatures.map((feature) => (
            <li key={feature} className="flex items-center gap-2.5 text-base">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                strokeWidth={2}
                size={20}
                aria-hidden="true"
                className="shrink-0 text-primary-text"
              />
              {feature}
            </li>
          ))}
        </ul>
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
        <h2 id="features-title" className="text-2xl sm:text-3xl">
          What every listing shows
        </h2>
        <ul role="list" className="mt-8 space-y-7">
          {features.map((feature) => (
            <li key={feature.title} className="flex gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-text dark:bg-primary-text/15">
                <HugeiconsIcon icon={feature.icon} strokeWidth={2} size={22} aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-lg">{feature.title}</h3>
                <p className="mt-1 text-base leading-relaxed">{feature.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <ExampleListing />
    </section>
  );
}
