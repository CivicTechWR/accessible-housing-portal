const contactEmail = "info@example.ca";

export function HomeContactSection() {
  return (
    <section id="join" aria-labelledby="join-title" className="border-t pt-12">
      <h2 id="join-title">Request access</h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Home Hub is invitation-only while we onboard our first users and providers. Email us, tell
        us whether you provide housing or help clients find it, and we&apos;ll get you set up.
      </p>
      <a
        href={`mailto:${contactEmail}`}
        className="mt-4 inline-block font-medium text-primary-text underline underline-offset-4"
      >
        {contactEmail}
      </a>
    </section>
  );
}
