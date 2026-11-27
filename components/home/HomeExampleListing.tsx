import Image from "next/image";

import { AccessibilityChips } from "@/components/listings-card/AccessibilityChips";
import { formatRent, formatRooms, RENT_PERIOD } from "@/lib/listing-format";

const exampleFeatures = [
  "Barrier-free main entrance",
  "Elevator in building",
  "Lowered kitchen counters",
];

/** A made-up listing that shows what a real one looks like. */
export function HomeExampleListing() {
  return (
    <figure className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xl shadow-black/8 dark:shadow-black/40">
      <div className="relative aspect-[3/2]">
        <Image
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
      {/* The same order and styles as a search result card. */}
      <div className="space-y-1 p-5">
        <p className="text-base font-semibold">Maple Court Apartments</p>
        <p className="text-xl font-bold">
          {formatRent(1450)}
          <span className="text-sm font-normal text-muted-foreground">{RENT_PERIOD}</span>
        </p>
        <p className="text-[0.9375rem] text-foreground/80">{formatRooms(1, 1, 620)}</p>
        <p className="text-sm text-muted-foreground">King St W, Kitchener · Available now</p>
        <AccessibilityChips features={exampleFeatures} className="pt-2" />
      </div>
      <figcaption className="sr-only">
        An example of how a listing appears to navigators.
      </figcaption>
    </figure>
  );
}
