import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { homeContent } from "@/content/home";
import { siteConfig } from "@/lib/site-config";

const linkClass = "font-medium text-primary-text underline underline-offset-4";
const { about } = homeContent;

export function HomeAboutSection() {
  return (
    <section
      aria-labelledby="about-title"
      className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:gap-16"
    >
      <div>
        <h2 id="about-title" className="text-2xl sm:text-3xl">
          About {siteConfig.name}
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-foreground">
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
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-xs">
        <p className="font-semibold">{about.aimsIntro}</p>
        <ul role="list" className="mt-4 space-y-3">
          {about.aims.map((aim) => (
            <li key={aim} className="flex gap-3">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                strokeWidth={2}
                size={20}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-primary-text"
              />
              <span>{aim}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
