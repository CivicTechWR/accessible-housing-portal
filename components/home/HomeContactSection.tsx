export function HomeContactSection() {
  return (
    <section
      id="page-3"
      data-home-section="true"
      aria-labelledby="page-3-title"
      className="min-h-[calc(100vh-56px)] scroll-mt-14 bg-[#cfe4f5] px-6 py-16 text-[#18324a] sm:px-10 lg:px-16"
    >
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#18324a]/58">
            Contact information
          </p>
          <h2 id="page-3-title" className="text-3xl font-semibold tracking-tight sm:text-5xl">
            Get in touch
          </h2>
          <p className="max-w-xl text-lg leading-8 text-[#18324a]/74">
            Use these details as the main contact point for the platform. You can replace them with
            the exact organization email, phone number, and office hours later.
          </p>
        </div>

        <div className="grid gap-4 rounded-[2rem] border border-sky-100 bg-[#eaf4fb] p-6 shadow-[0_18px_50px_rgba(56,116,166,0.12)] backdrop-blur-md sm:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#18324a]/55">Email</p>
            <p className="mt-2 text-xl font-medium">info@wrhousingbridge.ca</p>
          </div>
          <div className="border-t border-sky-100 pt-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#18324a]/55">Phone</p>
            <p className="mt-2 text-xl font-medium">(000) 000-0000</p>
          </div>
          <div className="border-t border-sky-100 pt-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#18324a]/55">Hours</p>
            <p className="mt-2 text-xl font-medium">Monday to Friday, 9:00 AM to 5:00 PM</p>
          </div>
        </div>
      </div>
    </section>
  );
}