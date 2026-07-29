export function HomeFAQSection() {
  return (
    <section
      id="page-4"
      data-home-section="true"
      aria-labelledby="page-4-title"
      className="min-h-[calc(100vh-56px)] scroll-mt-14 bg-[#dceeff] px-6 py-16 text-[#18324a] sm:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#18324a]/58">
          Frequently Asked Questions
        </p>
        <div className="mt-10 space-y-8">
          <div>
            <h3 className="text-xl font-semibold text-[#18324a]">
              Where is Accessible Housing Bridge available?
            </h3>
            <p className="mt-2 max-w-xl text-base text-[#18324a]/74">
              The platform is currently available in the Kitchener-Waterloo area of Ontario, Canada,
              with plans to expand to more communities as we gather feedback.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-[#18324a]">
              How much does Accessible Housing Bridge cost?
            </h3>
            <p className="mt-2 max-w-xl text-base text-[#18324a]/74">
              Accessible Housing Bridge is currently free to join during our initial rollout.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-[#18324a]">How can I list a property?</h3>
            <p className="mt-2 max-w-xl text-base text-[#18324a]/74">
              To list a property, create an account and navigate to the "List Your Property"
              section. Fill out the form with details about the property, including accessibility
              features, location, and contact information.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-[#18324a]">
              How do I find accessible and affordable housing on the platform?
            </h3>
            <p className="mt-2 max-w-xl text-base text-[#18324a]/74">
              Once you have access, you can browse listings on an interactive map, filter by
              accessibility and affordability criteria, save your filters, and set up alerts so
              you're notified when a matching home becomes available.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
