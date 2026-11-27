import { CancelCircleIcon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { homeContent } from "@/content/home";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const lists = [
  { title: `${siteConfig.name} is`, items: homeContent.scope.is, included: true },
  { title: `${siteConfig.name} is not`, items: homeContent.scope.isNot, included: false },
];

export function HomeScopeSection() {
  return (
    <section className="grid gap-10 md:grid-cols-2 md:gap-16">
      {lists.map((list) => (
        <div key={list.title}>
          <h2 className="text-2xl">{list.title}</h2>
          <ul role="list" className="mt-5 space-y-4">
            {list.items.map((item) => (
              <li key={item} className="flex gap-3 text-base leading-relaxed">
                <HugeiconsIcon
                  icon={list.included ? CheckmarkCircle02Icon : CancelCircleIcon}
                  strokeWidth={2}
                  size={22}
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 shrink-0",
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
