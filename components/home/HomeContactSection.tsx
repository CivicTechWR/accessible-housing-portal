import { Mail01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { homeContent } from "@/content/home";
import { siteConfig } from "@/lib/site-config";

export function HomeContactSection() {
  return (
    <section
      aria-labelledby="join-title"
      className="flex flex-col gap-6 rounded-2xl bg-primary px-6 py-10 text-primary-foreground sm:px-10 md:flex-row md:items-center md:justify-between"
    >
      <div className="max-w-2xl">
        <h2 id="join-title" className="text-2xl sm:text-3xl">
          Getting access
        </h2>
        <p className="mt-3 text-lg text-primary-foreground/90">{homeContent.access}</p>
      </div>
      <Button asChild size="lg" className="shrink-0 bg-white text-neutral-950 hover:bg-white/90">
        <a href={`mailto:${siteConfig.contactEmail}`}>
          <HugeiconsIcon icon={Mail01Icon} strokeWidth={1.75} data-icon="inline-start" />
          {siteConfig.contactEmail}
        </a>
      </Button>
    </section>
  );
}
