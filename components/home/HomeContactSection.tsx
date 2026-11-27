import { Mail01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { homeContent } from "@/content/home";
import { siteConfig } from "@/lib/site-config";

export function HomeContactSection() {
  return (
    <section
      aria-labelledby="join-title"
      className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between"
    >
      <div className="max-w-2xl">
        <h2 id="join-title" className="text-[1.75rem] sm:text-4xl">
          Getting access
        </h2>
        <p className="mt-3 text-[1.0625rem] leading-relaxed">{homeContent.access}</p>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
        <Button asChild size="lg">
          <a href={`mailto:${siteConfig.contactEmail}`}>
            <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} data-icon="inline-start" />
            Request access
          </a>
        </Button>
        <a
          href={`mailto:${siteConfig.contactEmail}`}
          className="text-base text-primary-text underline underline-offset-4"
        >
          {siteConfig.contactEmail}
        </a>
      </div>
    </section>
  );
}
