import Link from "next/link";

import { privacyNotice } from "@/content/privacy-notice";
import type { PrivacyNoticeDocument, PrivacyNoticeLink } from "@/lib/privacy-notice";

const linkClassName = "font-medium text-primary-text underline underline-offset-4 break-words";

function NoticeLink({ link }: { link: PrivacyNoticeLink }) {
  if (link.href.startsWith("/")) {
    return (
      <Link href={link.href} className={linkClassName}>
        {link.text}
      </Link>
    );
  }

  const isWebLink = link.external ?? /^https?:\/\//i.test(link.href);

  return (
    <a
      href={link.href}
      {...(isWebLink ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={linkClassName}
    >
      {link.text}
    </a>
  );
}

export function PrivacyNoticeContent({
  notice = privacyNotice,
}: {
  notice?: PrivacyNoticeDocument;
}) {
  return (
    <div className="space-y-6 text-sm leading-6">
      <p>{notice.introduction}</p>

      {notice.sections.map((section) => (
        <section key={section.id} id={section.id} className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
          {section.intro && <p className="text-muted-foreground">{section.intro}</p>}
          {section.paragraphs?.map((paragraph, index) => (
            <p key={`${section.id}-p-${index}`} className="text-muted-foreground">
              {paragraph}
            </p>
          ))}
          {section.items && section.items.length > 0 && (
            <ul className="list-disc space-y-3 pl-5 text-muted-foreground">
              {section.items.map((item) => (
                <li key={item.title}>
                  <span className="font-semibold text-foreground">{item.title}:</span> {item.body}
                  {item.link && (
                    <>
                      {" "}
                      <NoticeLink link={item.link} />
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          {section.link && (
            <p className="text-muted-foreground">
              <NoticeLink link={section.link} />
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
