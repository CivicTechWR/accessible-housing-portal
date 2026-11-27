import { siteConfig } from "@/lib/site-config";

/** What the service is and isn't, in two short paragraphs. */
export function HomeScopeSection() {
  return (
    <section aria-labelledby="scope-title" className="max-w-3xl">
      <h2 id="scope-title" className="text-2xl sm:text-[1.75rem]">
        What {siteConfig.name} is, and isn&apos;t
      </h2>
      <p className="mt-4 text-[1.0625rem] leading-relaxed">
        {siteConfig.name} is a free listing site for affordable and accessible units in{" "}
        {siteConfig.region}, a bit like Realtor.ca for specific types of units. It&apos;s for
        housing navigators, case workers and social support organizations, and for understanding,
        flexible housing providers who work with support organizations and tenants to keep housing
        stable.
      </p>
      <p className="mt-4 text-[1.0625rem] leading-relaxed">
        It isn&apos;t an alternative to CHAC or the PATHS List, and it isn&apos;t open to the
        public.
        {siteConfig.name} doesn&apos;t give direct support, referrals or guidance on finding
        housing, and it doesn&apos;t mediate between organizations, individuals and housing
        providers.
      </p>
    </section>
  );
}
