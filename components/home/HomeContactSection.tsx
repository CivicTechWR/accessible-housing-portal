import { siteConfig } from "@/lib/site-config";

export function HomeContactSection() {
  return (
    <section aria-labelledby="join-title" className="border-t pt-12">
      <h2 id="join-title">Getting access</h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        {siteConfig.name} is invitation-only while we onboard our first cohort of navigators and
        providers. Please reach out if you would like to learn more about {siteConfig.name}.
      </p>
      <a
        href={`mailto:${siteConfig.contactEmail}`}
        className="mt-4 inline-block font-medium text-primary-text underline underline-offset-4"
      >
        {siteConfig.contactEmail}
      </a>
    </section>
  );
}
