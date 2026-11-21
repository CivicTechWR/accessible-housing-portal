import { homeContent } from "@/content/home";
import { siteConfig } from "@/lib/site-config";

const lists = [
  { title: `${siteConfig.name} is:`, items: homeContent.scope.is },
  { title: `${siteConfig.name} is not:`, items: homeContent.scope.isNot },
];

export function HomeScopeSection() {
  return (
    <section className="grid gap-10 border-t pt-12 md:grid-cols-2">
      {lists.map((list) => (
        <div key={list.title}>
          <h2>{list.title}</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
            {list.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
