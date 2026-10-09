import type { ReactNode } from "react";

const linkClass = "text-primary-text underline underline-offset-4";

const faqs: { question: string; answer: ReactNode }[] = [
  {
    question: "Where is Home Hub available?",
    answer:
      "Waterloo Region, Ontario. We plan to expand to more communities as we gather feedback.",
  },
  {
    question: "How much does it cost?",
    answer: "Home Hub is free to join.",
  },
  {
    question: "How do housing providers list a rental?",
    answer:
      "Request access and tell us you're a provider. Once your account is set up, you can create listings with their accessibility and affordability details.",
  },
  {
    question: "Who runs Home Hub?",
    answer: (
      <>
        Home Hub is a collaboration between{" "}
        <a href="https://www.unionsd.coop/" className={linkClass}>
          Union Co-operative
        </a>{" "}
        and{" "}
        <a href="https://civictechwr.org/" className={linkClass}>
          Civic Tech Waterloo Region
        </a>
        .
      </>
    ),
  },
];

export function HomeFAQSection() {
  return (
    <section aria-labelledby="faq-title" className="border-t pt-12">
      <h2 id="faq-title">Frequently asked questions</h2>
      <div className="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-2">
        {faqs.map((faq) => (
          <div key={faq.question}>
            <h3 className="text-base">{faq.question}</h3>
            <p className="mt-1 text-muted-foreground">{faq.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
