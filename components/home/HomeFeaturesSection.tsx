import { DollarCircleIcon, MapsLocation01Icon, WheelchairIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

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

export function HomeFeaturesSection() {
  return (
    <section aria-labelledby="features-title">
      <h2 id="features-title" className="text-3xl">
        What every listing shows
      </h2>
      <ul role="list" className="mt-8 grid gap-6 md:grid-cols-3">
        {features.map((feature) => (
          <li key={feature.title} className="rounded-xl border bg-card p-6 shadow-xs">
            <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary-text dark:bg-primary-text/15">
              <HugeiconsIcon icon={feature.icon} strokeWidth={2} size={22} aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-lg">{feature.title}</h3>
            <p className="mt-2 text-base leading-7">{feature.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
