import Link from "next/link";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";

import { BrandMark } from "@/components/brand/BrandMark";
import { ThemeToggle } from "@/components/theme-toggle/ThemeToggle";
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
      <div className="site-container grid grid-cols-1 gap-x-6 gap-y-8 py-8 sm:grid-cols-2 sm:py-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3 sm:col-span-2 md:col-span-1">
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
        <div className="min-w-0 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Get in touch</h2>
          <ul className="space-y-2">
            <li>
              <a
                href={`mailto:${siteConfig.contactEmail}`}
                className={cn(linkClass, "wrap-anywhere")}
              >
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
        <div className="site-container flex flex-col gap-3 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <p>
              © {new Date().getFullYear()} {siteConfig.operator.name}
            </p>
            <div className="flex items-center gap-2">
              <span aria-hidden="true">Theme</span>
              <ThemeToggle />
            </div>
          </div>
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
