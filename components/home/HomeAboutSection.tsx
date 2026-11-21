import { siteConfig } from "@/lib/site-config";

const linkClass = "text-primary-text underline underline-offset-4";

export function HomeAboutSection() {
  return (
    <section className="max-w-3xl text-muted-foreground">
      <p>
        <strong className="text-foreground">{siteConfig.name}</strong> is a community-led rental
        listing platform connecting housing navigators from social service organizations with
        affordable and accessible units from values-aligned housing providers. Co-created by{" "}
        <a href={siteConfig.operator.url} className={linkClass}>
          {siteConfig.operator.name}
        </a>{" "}
        and{" "}
        <a href={siteConfig.builder.url} className={linkClass}>
          {siteConfig.builder.name}
        </a>
        , the platform offers transparent listings—including pricing, accessibility features, and
        forms of income landlords will accept.
      </p>
      <p className="mt-4">The platform aims to:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Streamline the search for affordable and accessible housing units.</li>
        <li>
          Rent accessible and affordable units to tenants who most benefit from their features.
        </li>
      </ul>
    </section>
  );
}
