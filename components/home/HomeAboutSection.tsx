import { homeContent } from "@/content/home";
import { siteConfig } from "@/lib/site-config";

const linkClass = "text-primary-text underline underline-offset-4";
const { about } = homeContent;

export function HomeAboutSection() {
  return (
    <section className="max-w-3xl text-muted-foreground">
      <p>
        <strong className="text-foreground">{siteConfig.name}</strong> {about.lead}{" "}
        <a href={siteConfig.operator.url} className={linkClass}>
          {siteConfig.operator.name}
        </a>{" "}
        and{" "}
        <a href={siteConfig.builder.url} className={linkClass}>
          {siteConfig.builder.name}
        </a>
        {about.rest}
      </p>
      <p className="mt-4">{about.aimsIntro}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {about.aims.map((aim) => (
          <li key={aim}>{aim}</li>
        ))}
      </ul>
    </section>
  );
}
