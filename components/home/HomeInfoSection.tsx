import Image from "next/image";

const placeholderImage = "/home-image-placeholder.svg";

const cards = [
  {
    id: "seekers",
    eyebrow: "Trust the listings",
    title: "For case workers and housing support staff",
    body: "If you help clients find affordable or accessible housing, you know how much time gets lost chasing incomplete listings. We make that work faster and more reliable.",
  },
  {
    id: "providers",
    eyebrow: "User benefits",
    title: "For housing providers",
    body: "If you own or develop accessible and affordable housing, you want your units seen by the people and professionals best positioned to fill them responsibly.",
  },
  {
    id: "join",
    eyebrow: "Next steps",
    title: "How do I join Home Hub?",
    body: "Access is by invitation as we onboard our first community of users and providers. Whether you’re a social worker looking to connect clients with housing, or a provider with accessible and affordable units to list, we’d love to have you. Contact us to request access, let us know which group you belong to (housing provider/developer or social worker/housing seeker), and we’ll get you set up.",
  },
];

export function HomeInfoSection() {
  return (
    <section
      id="about"
      aria-labelledby="about-title"
      className="bg-background px-6 py-16 text-foreground sm:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-7xl">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            About this website
          </p>
          <h2 id="about-title" className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
            What is Home Hub?
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            Home Hub is a housing listings platform purpose-built for affordable and accessible
            rentals in Waterloo Region.
          </p>
        </header>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {cards.map((card) => (
            <article
              key={card.id}
              aria-labelledby={`about-${card.id}-title`}
              className="group overflow-hidden rounded-3xl border bg-card text-card-foreground shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="relative h-56 overflow-hidden">
                <Image
                  src={placeholderImage}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover object-center brightness-95 saturate-80 transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-linear-to-t from-card/80 via-card/15 to-transparent" />
              </div>
              <div className="space-y-3 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary-text">
                  {card.eyebrow}
                </p>
                <h3 id={`about-${card.id}-title`} className="text-xl font-semibold">
                  {card.title}
                </h3>
                <p className="text-sm leading-7 text-muted-foreground">{card.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
