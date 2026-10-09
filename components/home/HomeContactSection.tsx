const contactEmail = "info@example.ca";

export function HomeContactSection() {
  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="bg-background px-6 py-16 text-foreground sm:px-10 lg:px-16"
    >
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Contact information
          </p>
          <h2 id="contact-title" className="text-3xl font-semibold tracking-tight sm:text-5xl">
            Get in touch
          </h2>
        </div>

        <div className="grid gap-4 rounded-3xl border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Email
            </p>
            <a
              href={`mailto:${contactEmail}`}
              className="mt-2 inline-block text-xl font-medium text-primary-text underline-offset-4 hover:underline"
            >
              {contactEmail}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
