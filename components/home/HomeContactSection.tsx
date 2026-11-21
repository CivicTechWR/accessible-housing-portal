import { homeContent } from "@/content/home";
import { siteConfig } from "@/lib/site-config";

export function HomeContactSection() {
  return (
    <section aria-labelledby="join-title" className="border-t pt-12">
      <h2 id="join-title">Getting access</h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">{homeContent.access}</p>
      <a
        href={`mailto:${siteConfig.contactEmail}`}
        className="mt-4 inline-block font-medium text-primary-text underline underline-offset-4"
      >
        {siteConfig.contactEmail}
      </a>
    </section>
  );
}
