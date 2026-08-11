import Image from "next/image";
import socialImage from "../../assets/socialworkers.jpg";
import providerImage from "../../assets/housingProviders.jpg";

const accessRequestHref =
  "mailto:example@example.com?subject=Accessible%20Housing%20Bridge%20Access";

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
            Accessible homes should reach people who need them
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[#18324a]/75 sm:text-lg">
            Affordable housing providers often receive more applications than they can accommodate.
            In that rush, homes with accessibility features may not reach the people who rely on
            them. Accessible Housing Bridge creates a trusted connection between providers and the
            organizations and social workers supporting clients with specific, often non-negotiable
            access needs.
          </p>
        </header>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <article
            aria-labelledby="page-2-card-1-title"
            className="group flex flex-col overflow-hidden rounded-[2rem] border border-sky-100 bg-[#eaf4fb] shadow-[0_18px_50px_rgba(56,116,166,0.12)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(56,116,166,0.18)]"
          >
            <div className="relative h-56 overflow-hidden">
              <Image
                src={socialImage}
                alt="Accessible housing building with a clear entryway and barrier-free approach"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-center brightness-95 saturate-80 transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-linear-to-t from-[#cfe4f5]/86 via-[#cfe4f5]/16 to-transparent" />
            </div>
            <div className="flex flex-1 flex-col gap-3 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">
                Find the right fit
              </p>
              <h3 id="page-2-card-1-title" className="text-xl font-semibold text-[#18324a]">
                For Organizations and Social Workers
              </h3>
              <p className="flex-1 text-sm leading-7 text-[#18324a]/72">
                Search affordable rentals using detailed accessibility information, so you can focus
                on homes that meet each client’s needs and avoid unsuitable applications.
              </p>
              <a
                href={accessRequestHref}
                className="mt-auto inline-flex self-start rounded-full bg-[#18324a] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              >
                Request access
              </a>
            </div>
          </article>

          <article
            aria-labelledby="page-2-card-2-title"
            className="group flex flex-col overflow-hidden rounded-[2rem] border border-sky-100 bg-[#eaf4fb] shadow-[0_18px_50px_rgba(56,116,166,0.12)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(56,116,166,0.18)]"
          >
            <div className="relative h-56 overflow-hidden">
              <Image
                src={providerImage}
                alt="Housing provider showcasing accessible units"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-center brightness-95 saturate-80 transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-linear-to-t from-[#cfe4f5]/86 via-[#cfe4f5]/16 to-transparent" />
            </div>
            <div className="flex flex-1 flex-col gap-3 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">
                Reach the right applicants
              </p>
              <h3 id="page-2-card-2-title" className="text-xl font-semibold text-[#18324a]">
                For Housing Providers
              </h3>
              <p className="flex-1 text-sm leading-7 text-[#18324a]/72">
                Share accessible units with trusted organizations that understand their clients’
                needs, helping specialized homes reach people who can benefit from their features.
              </p>
              <a
                href={accessRequestHref}
                className="mt-auto inline-flex self-start rounded-full bg-[#18324a] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              >
                Request access
              </a>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
