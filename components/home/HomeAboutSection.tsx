import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { WALK_SCORE_ATTRIBUTION_URL } from "@/components/listing-details/WalkScore";
import { homeContent } from "@/content/home";
import { siteConfig } from "@/lib/site-config";

const linkClass = "font-medium text-primary-text underline underline-offset-4";
const { about } = homeContent;

export function HomeAboutSection() {
  return (
    <section aria-labelledby="about-title">
      <h2 id="about-title" className="text-2xl sm:text-3xl">
        Who it&apos;s for
      </h2>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed">
        {siteConfig.name} {about.lead}{" "}
        <a href={siteConfig.operator.url} className={linkClass}>
          {siteConfig.operator.name}
        </a>{" "}
        and{" "}
        <a href={siteConfig.builder.url} className={linkClass}>
          {siteConfig.builder.name}
        </a>
        {about.rest}
      </p>
      <p className="mt-6 font-semibold">{about.aimsIntro}</p>
      <ul role="list" className="mt-3 grid gap-3 md:grid-cols-2 md:gap-16">
        {about.aims.map((aim) => (
          <li key={aim} className="flex gap-3 text-base leading-relaxed">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              strokeWidth={2}
              size={22}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-primary-text"
            />
            <span>{aim}</span>
          </li>
        ))}
      </ul>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-xs">
          <h3 className="text-xl">Housing navigators and case workers</h3>
          <p className="mt-3 text-base leading-relaxed">
            Find units from values-aligned providers in one place, on a map, with filters for
            accessibility and affordability. Listings show{" "}
            <a
              href={WALK_SCORE_ATTRIBUTION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              Walk Score®
            </a>{" "}
            and transit ratings where available, and saved filters and alerts are coming soon.
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-xs">
          <h3 className="text-xl">Housing providers and developers</h3>
          <p className="mt-3 text-base leading-relaxed">
            Put accessible and affordable units in front of navigators and case workers from trusted
            social agencies, so they go to tenants who need their features.
          </p>
        </div>
      </div>
    </section>
  );
}
