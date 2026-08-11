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
              Who can join Accessible Housing Bridge?
            </h3>
            <p className="mt-2 max-w-xl text-base text-[#18324a]/74">
              During our initial rollout, access is available by invitation to housing providers,
              organizations, and social workers helping clients find suitable housing.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-[#18324a]">How can I list a property?</h3>
            <p className="mt-2 max-w-xl text-base text-[#18324a]/74">
              Housing providers can contact us to request access. Once invited, you can create a
              listing with details about the home’s accessibility features, location, cost, and
              application process.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-[#18324a]">
              How does the platform help match people with housing?
            </h3>
            <p className="mt-2 max-w-xl text-base text-[#18324a]/74">
              Providers share detailed information about their available homes. Organizations and
              social workers can then search by accessibility needs and affordability to identify
              suitable options for their clients.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
