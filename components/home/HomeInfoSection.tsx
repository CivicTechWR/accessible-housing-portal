import { WALK_SCORE_ATTRIBUTION_URL } from "@/components/listing-details/WalkScore";
import { siteConfig } from "@/lib/site-config";

export function HomeInfoSection() {
  return (
    <section aria-labelledby="audience-title">
      <h2 id="audience-title" className="text-3xl">
        Who it&apos;s for
      </h2>
      <div className="mt-8 grid gap-10 md:grid-cols-2 md:gap-16">
        <div>
          <h3 className="text-xl">Housing navigators and case workers</h3>
          <p className="mt-3 text-base leading-7">
            Finding a unit that works for a client often means informal calls, several listing
            sites, and checking accessibility details through site visits. {siteConfig.name} puts
            listings from values-aligned providers in one place, on a map, with filters for
            accessibility and affordability features. Listings also show{" "}
            <a
              href={WALK_SCORE_ATTRIBUTION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary-text underline underline-offset-4"
            >
              Walk Score®
            </a>{" "}
            and transit ratings where available. Saved filters and alerts are coming soon.
          </p>
        </div>
        <div>
          <h3 className="text-xl">Housing providers and developers</h3>
          <p className="mt-3 text-base leading-7">
            Accessible and affordable units do the most good when they go to tenants who need their
            features. {siteConfig.name} puts your listings in front of housing navigators and case
            workers from trusted social agencies, so you fill units efficiently and with supported
            tenants.
          </p>
        </div>
      </div>
    </section>
  );
}
