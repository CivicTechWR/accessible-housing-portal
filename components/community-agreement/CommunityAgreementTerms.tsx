import { communityAgreement } from "@/content/community-agreement";

export function CommunityAgreementTerms() {
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
                    <a
                      href={item.link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary underline underline-offset-4"
                    >
                      {item.link.text}
                    </a>
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
