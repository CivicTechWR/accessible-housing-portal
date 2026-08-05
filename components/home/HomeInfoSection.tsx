import Image from "next/image";
import socialImage from "../../assets/socialworkers.jpg";
import providerImage from "../../assets/housingProviders.jpg";
import joinImage from "../../assets/joinimage.jpg";

export function HomeInfoSection() {
  return (
    <section
      id="page-2"
      data-home-section="true"
      aria-labelledby="page-2-title"
      className="min-h-[calc(100vh-56px)] scroll-mt-14 bg-[#cfe4f5] px-6 py-16 text-[#18324a] sm:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-7xl">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#18324a]/58">
            About this website
          </p>
          <h2 id="page-2-title" className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
            What is Accessibility Housing
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[#18324a]/75 sm:text-lg">
            Accessible Housing Bridge is a housing listings platform purpose-built for affordable
            and accessible rentals in the Kitchener-Waterloo region.
          </p>
        </header>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <article
            aria-labelledby="page-2-card-1-title"
            className="group overflow-hidden rounded-[2rem] border border-sky-100 bg-[#eaf4fb] shadow-[0_18px_50px_rgba(56,116,166,0.12)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(56,116,166,0.18)]"
          >
            <div className="relative h-56 overflow-hidden">
              <Image
                src={socialImage}
                alt="Accessible housing building with a clear entryway and barrier-free approach"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover object-center brightness-95 saturate-80 transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-linear-to-t from-[#cfe4f5]/86 via-[#cfe4f5]/16 to-transparent" />
            </div>
            <div className="space-y-3 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">
                Trust the listings
              </p>
              <h3 id="page-2-card-1-title" className="text-xl font-semibold text-[#18324a]">
                For House Seekers
              </h3>
              <p className="text-sm leading-7 text-[#18324a]/72">
                If you help clients find affordable or accessible housing, you know how much time
                gets lost chasing incomplete listings. We make that work faster and more reliable.
              </p>
            </div>
          </article>

          <article
            aria-labelledby="page-2-card-2-title"
            className="group overflow-hidden rounded-[2rem] border border-sky-100 bg-[#eaf4fb] shadow-[0_18px_50px_rgba(56,116,166,0.12)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(56,116,166,0.18)]"
          >
            <div className="relative h-56 overflow-hidden">
              <Image
                src={providerImage}
                alt="Housing provider showcasing accessible units"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover object-center brightness-95 saturate-80 transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-linear-to-t from-[#cfe4f5]/86 via-[#cfe4f5]/16 to-transparent" />
            </div>
            <div className="space-y-3 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">
                User benefits
              </p>
              <h3 id="page-2-card-2-title" className="text-xl font-semibold text-[#18324a]">
                For Housing Providers
              </h3>
              <p className="text-sm leading-7 text-[#18324a]/72">
                If you own or develop accessible and affordable housing, you want your units seen by
                the people and professionals best positioned to fill them responsibly.
              </p>
            </div>
          </article>

          <article
            aria-labelledby="page-2-card-3-title"
            className="group overflow-hidden rounded-[2rem] border border-sky-100 bg-[#eaf4fb] shadow-[0_18px_50px_rgba(56,116,166,0.12)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(56,116,166,0.18)]"
          >
            <div className="relative h-56 overflow-hidden">
              <Image
                src={joinImage}
                alt="Person joining the Accessible Housing Bridge community"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover object-center brightness-95 saturate-80 transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-linear-to-t from-[#cfe4f5]/86 via-[#cfe4f5]/16 to-transparent" />
            </div>
            <div className="space-y-3 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">
                Next steps
              </p>
              <h3 id="page-2-card-3-title" className="text-xl font-semibold text-[#18324a]">
                How do I join Accessible Housing Bridge?
              </h3>
              <p className="text-sm leading-7 text-[#18324a]/72">
                Access is by invitation as we onboard our first community of users and providers.
                Whether you’re a social worker looking to connect clients with housing, or a
                provider with accessible and affordable units to list, we’d love to have you.
                Contact us to request access, let us know which group you belong to (housing
                provider/developer or social working/housing seeker), and we’ll get you set up.
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
