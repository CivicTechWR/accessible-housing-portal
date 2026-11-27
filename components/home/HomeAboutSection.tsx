import { WALK_SCORE_ATTRIBUTION_URL } from "@/components/listing-details/WalkScore";

const linkClass = "font-medium text-primary-text underline underline-offset-4";

const audienceClass = "border-t-4 border-primary pt-5 dark:border-primary-text";

export function HomeAboutSection() {
  return (
    <section aria-labelledby="about-title">
      <h2 id="about-title" className="text-[1.75rem] sm:text-4xl">
        Who it&apos;s for
      </h2>
      {/* Two audiences side by side, each under a heavy rule like a sign's header bar. */}
      <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-12">
        <div className={audienceClass}>
          <h3 className="text-xl">Housing navigators and case workers</h3>
          <p className="mt-3 text-[1.0625rem] leading-relaxed">
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
        <div className={audienceClass}>
          <h3 className="text-xl">Housing providers and developers</h3>
          <p className="mt-3 text-[1.0625rem] leading-relaxed">
            Put accessible and affordable units in front of navigators and case workers from trusted
            social agencies, so they go to tenants who need their features.
          </p>
        </div>
      </div>
    </section>
  );
}
