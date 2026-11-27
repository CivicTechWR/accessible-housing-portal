import { WALK_SCORE_ATTRIBUTION_URL } from "@/components/listing-details/WalkScore";
import { homeContent } from "@/content/home";
import { siteConfig } from "@/lib/site-config";

const linkClass = "font-medium text-primary-text underline underline-offset-4";
const { about } = homeContent;

export function HomeAboutSection() {
  return (
    <section aria-labelledby="about-title">
      <h2 id="about-title" className="text-[1.75rem] sm:text-4xl">
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
      <p className="mt-6 font-medium">{about.aimsIntro}</p>
      <ul className="mt-2 max-w-3xl list-disc space-y-1.5 pl-5 text-base leading-relaxed marker:text-muted-foreground">
        {about.aims.map((aim) => (
          <li key={aim}>{aim}</li>
        ))}
      </ul>
      {/* Two audiences side by side, each under a heavy rule like a sign's header bar. */}
      <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-12">
        <div className="border-t-4 border-primary pt-5">
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
        <div className="border-t-4 border-primary pt-5">
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
