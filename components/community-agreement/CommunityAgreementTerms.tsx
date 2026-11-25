import Link from "next/link";

import { communityAgreement } from "@/content/community-agreement";

const linkClassName = "font-medium text-primary-text underline underline-offset-4";

export function CommunityAgreementTerms({
  openInternalLinksInNewTab = false,
}: {
  openInternalLinksInNewTab?: boolean;
}) {
  return (
    <div className="space-y-6 text-sm leading-6">
      <p>{communityAgreement.introduction}</p>

      {communityAgreement.sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
          <ul className="list-disc space-y-3 pl-5 text-muted-foreground">
            {section.items.map((item) => (
              <li key={item.title}>
                <span className="font-semibold text-foreground">{item.title}:</span> {item.body}
                {item.link && (
                  <>
                    {" "}
                    {item.link.href.startsWith("/") ? (
                      <Link
                        href={item.link.href}
                        {...(openInternalLinksInNewTab
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        className={linkClassName}
                      >
                        {item.link.text}
                      </Link>
                    ) : (
                      <a
                        href={item.link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={linkClassName}
                      >
                        {item.link.text}
                      </a>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="font-medium text-foreground">{communityAgreement.closing}</p>
    </div>
  );
}
