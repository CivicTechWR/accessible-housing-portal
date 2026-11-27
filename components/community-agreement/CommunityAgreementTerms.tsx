import { communityAgreement } from "@/content/community-agreement";

export function CommunityAgreementTerms() {
  return (
    <div className="space-y-8 text-base leading-relaxed">
      <p>{communityAgreement.introduction}</p>

      {communityAgreement.sections.map((section) => (
        <section key={section.title} className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
          <ul role="list" className="space-y-4">
            {section.items.map((item) => (
              <li key={item.title}>
                <span className="block font-semibold text-foreground">{item.title}</span>
                {item.body}
                {item.link && (
                  <>
                    {" "}
                    <a
                      href={item.link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary-text underline underline-offset-4"
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

      <p className="rounded-xl bg-muted px-5 py-4 font-medium text-foreground">
        {communityAgreement.closing}
      </p>
    </div>
  );
}
