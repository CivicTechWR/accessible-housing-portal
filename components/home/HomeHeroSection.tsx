import Image from "next/image";
import heroImage from "../../assets/Goodwill-Baptist-Rendering-scaled.jpg";

export function HomeHeroSection() {
  return (
    <section
      id="page-1"
      data-home-section="true"
      aria-labelledby="page-1-title"
      className="relative isolate flex min-h-[calc(100vh-56px)] items-end overflow-hidden bg-[#dbeeff]"
    >
      <div className="absolute inset-0">
        <Image
          src={heroImage}
          alt="Rendering of an accessible housing building"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center brightness-90 saturate-75"
        />
        <div className="absolute inset-0 bg-linear-to-t from-[#c8e3ff]/92 via-[#d6ebff]/72 to-[#e7f4ff]/30" />
      </div>

      <div className="relative z-10 w-full px-6 pb-10 pt-24 sm:px-10 sm:pb-14 lg:px-16">
        <p className="max-w-2xl text-xs font-semibold uppercase tracking-[0.35em] text-slate-700 drop-shadow-[0_2px_10px_rgba(255,255,255,0.4)]">
          Waterloo Region Accessible Housing
        </p>
        <div className="max-w-2xl pt-3 text-slate-900">
          <h1
            id="page-1-title"
            className="mt-2 text-4xl font-semibold tracking-tight drop-shadow-[0_2px_14px_rgba(255,255,255,0.5)] sm:text-6xl"
          >
            Find accessible housing with less friction
          </h1>
          <p className="mt-4 max-w-xl text-base text-slate-700 drop-shadow-[0_2px_10px_rgba(255,255,255,0.35)] sm:text-lg">
            Connecting affordable, accessible housing seekers with the providers who serve them.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#page-2"
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
            >
              About the site
            </a>
            <a
              href="#page-3"
              className="rounded-full border border-slate-400/35 bg-white/45 px-5 py-2.5 text-sm font-semibold text-slate-900 transition-transform hover:-translate-y-0.5 hover:bg-white/60"
            >
              Contact us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
