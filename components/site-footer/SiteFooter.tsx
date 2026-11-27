import Link from "next/link";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";

import { BrandMark } from "@/components/brand/BrandMark";
import { WALK_SCORE_ATTRIBUTION_URL } from "@/components/listing-details/WalkScore";

const siteMap = [
  { href: "/", label: "Home" },
  { href: "/listings", label: "Browse listings" },
  { href: "/community-agreement", label: "Community agreement and terms of use" },
];

const linkClass =
  "rounded-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline";

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("border-t bg-muted/50 text-sm", className)}>
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-8 sm:px-6 sm:py-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="col-span-2 space-y-3 md:col-span-1">
          <p className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-foreground">
            <BrandMark className="size-7" />
            {siteConfig.name}
          </p>
          <p className="max-w-sm leading-relaxed text-muted-foreground">
            Affordable, accessible rentals in {siteConfig.region}. Run by{" "}
            <a
              href={siteConfig.operator.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(linkClass, "underline")}
            >
              {siteConfig.operator.name}
            </a>{" "}
            and built by volunteers at{" "}
            <a
              href={siteConfig.builder.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(linkClass, "underline")}
            >
              Civic Tech WR
            </a>
            .
          </p>
        </div>
        <nav aria-labelledby="footer-site-map" className="space-y-3">
          <h2 id="footer-site-map" className="text-sm font-semibold text-foreground">
            Site map
          </h2>
          <ul className="space-y-2">
            {siteMap.map((page) => (
              <li key={page.href}>
                <Link href={page.href} className={linkClass}>
                  {page.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Get in touch</h2>
          <ul className="space-y-2">
            <li>
              <a href={`mailto:${siteConfig.contactEmail}`} className={linkClass}>
                {siteConfig.contactEmail}
              </a>
            </li>
            <li>
              <a
                href={siteConfig.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                Source code on GitHub
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {siteConfig.operator.name}
          </p>
          <p>
            Location scores:{" "}
            <a
              href={WALK_SCORE_ATTRIBUTION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Walk Score® by Redfin
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
