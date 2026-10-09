const faqs = [
  {
    question: "Where is Home Hub available?",
    answer:
      "The platform is currently available in Waterloo Region, Ontario, Canada, with plans to expand to more communities as we gather feedback.",
  },
  {
    question: "How much does Home Hub cost?",
    answer: "Home Hub is currently free to join during our initial rollout.",
  },
  {
    question: "How do housing providers list a rental?",
    answer:
      "Home Hub is invitation-only. Request access and let us know you're a housing provider. Once you're set up, you can create rental listings that highlight accessibility and affordability details, making units easy to find for social workers searching on behalf of clients.",
  },
  {
    question: "How do I find accessible and affordable housing on the platform?",
    answer:
      "Once you have access, you can browse listings on an interactive map and filter by accessibility and affordability criteria. Saved filters and alerts for new matching listings are coming soon.",
  },
];

export function HomeFAQSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="bg-muted/50 px-6 py-16 text-foreground sm:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-6xl">
        <h2 id="faq-title" className="text-3xl font-semibold tracking-tight sm:text-5xl">
          Frequently asked questions
        </h2>
        <div className="mt-10 space-y-8">
          {faqs.map((faq) => (
            <div key={faq.question}>
              <h3 className="text-xl font-semibold">{faq.question}</h3>
              <p className="mt-2 max-w-xl text-base text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
