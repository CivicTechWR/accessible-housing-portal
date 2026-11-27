import { Building03Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { ReactNode } from "react";

import { WALK_SCORE_ATTRIBUTION_URL } from "@/components/listing-details/WalkScore";
import { siteConfig } from "@/lib/site-config";

function AudienceCard({
  icon,
  title,
  children,
}: {
  icon: IconSvgElement;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-xs sm:p-8">
      <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary-text dark:bg-primary-text/15">
        <HugeiconsIcon icon={icon} strokeWidth={2} size={22} aria-hidden="true" />
      </span>
      <h3 className="mt-5 text-xl">{title}</h3>
      <p className="mt-3 leading-relaxed">{children}</p>
    </div>
  );
}

export function HomeInfoSection() {
  return (
    <section aria-labelledby="audience-title">
      <h2 id="audience-title" className="text-2xl sm:text-3xl">
        Who it&apos;s for
      </h2>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <AudienceCard icon={UserGroupIcon} title="Housing navigators and case workers">
          Finding a unit that works for a client often means informal calls, several listing sites,
          and checking accessibility details through site visits. {siteConfig.name} puts listings
          from values-aligned providers in one place, on a map, with filters for accessibility and
          affordability features. Listings also show{" "}
          <a
            href={WALK_SCORE_ATTRIBUTION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary-text underline underline-offset-4"
          >
            Walk Score®
          </a>{" "}
          and transit ratings where available. Saved filters and alerts are coming soon.
        </AudienceCard>
        <AudienceCard icon={Building03Icon} title="Housing providers and developers">
          Accessible and affordable units do the most good when they go to tenants who need their
          features. {siteConfig.name} puts your listings in front of housing navigators and case
          workers from trusted social agencies, so you fill units efficiently and with supported
          tenants.
        </AudienceCard>
      </div>
    </section>
  );
}
