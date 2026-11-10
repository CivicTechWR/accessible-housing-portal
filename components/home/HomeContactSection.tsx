const contactEmail = "hello@unioncommunityhousing.org";

export function HomeContactSection() {
  return (
    <section aria-labelledby="join-title" className="border-t pt-12">
      <h2 id="join-title">Getting access</h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Home Hub is invitation-only while we onboard our first cohort of navigators and providers.
        Please reach out if you would like to learn more about Home Hub.
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
