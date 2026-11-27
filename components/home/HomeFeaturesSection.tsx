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

export function HomeFeaturesSection() {
  return (
    <section aria-labelledby="features-title">
      <h2 id="features-title" className="text-[1.75rem] sm:text-4xl">
        What every listing shows
      </h2>
      <ul role="list" className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
        {features.map((feature) => (
          <li key={feature.title} className="border-t-2 border-foreground pt-5">
            <h3 className="text-lg">{feature.title}</h3>
            <p className="mt-2 text-[1.0625rem] leading-relaxed">{feature.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
