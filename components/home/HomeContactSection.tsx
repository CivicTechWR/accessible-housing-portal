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
        <p className="mt-3 text-lg text-primary-foreground/90">{homeContent.access}</p>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
        <Button
          asChild
          size="lg"
          className="bg-white text-primary hover:bg-white/90 dark:bg-white dark:text-[#17478f] dark:hover:bg-white/90"
        >
          <a href={`mailto:${siteConfig.contactEmail}`}>
            <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} data-icon="inline-start" />
            Request access
          </a>
        </Button>
        <a
          href={`mailto:${siteConfig.contactEmail}`}
          className="text-base text-white underline underline-offset-2"
        >
          {siteConfig.contactEmail}
        </a>
      </div>
    </section>
  );
}
