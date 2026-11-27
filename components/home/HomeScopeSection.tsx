import { Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { homeContent } from "@/content/home";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const lists = [
  { title: `${siteConfig.name} is`, items: homeContent.scope.is, included: true },
  { title: `${siteConfig.name} is not`, items: homeContent.scope.isNot, included: false },
];

/** What the service is and isn't, in two panels side by side so the lists read as a comparison. */
export function HomeScopeSection() {
  return (
    <section
      aria-label={`What ${siteConfig.name} is and is not`}
      className="grid gap-10 md:grid-cols-2 md:gap-12"
    >
      {lists.map((list) => (
        <div key={list.title} className="rounded-xl border bg-card p-6 sm:p-8">
          <h2 className="text-2xl">{list.title}</h2>
          <ul role="list" className="mt-4 divide-y">
            {list.items.map((item) => (
              <li key={item} className="flex gap-3 py-3.5 text-[1.0625rem] leading-relaxed">
                <HugeiconsIcon
                  icon={list.included ? Tick02Icon : Cancel01Icon}
                  strokeWidth={2.5}
                  size={18}
                  aria-hidden="true"
                  className={cn(
                    "mt-1 shrink-0",
                    list.included ? "text-primary-text" : "text-muted-foreground",
                  )}
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
