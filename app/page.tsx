import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { HomeFeaturesSection } from "@/components/home/HomeFeaturesSection";
import { HomeAboutSection } from "@/components/home/HomeAboutSection";
import { HomeContactSection } from "@/components/home/HomeContactSection";
import { HomeHeroSection } from "@/components/home/HomeHeroSection";
import { HomeBand } from "@/components/home/HomeBand";
import { HomeScopeSection } from "@/components/home/HomeScopeSection";
import { getOptionalSession } from "@/lib/auth/session";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: {
    absolute: `${siteConfig.name} | Affordable & Accessible Housing Rental Listings in ${siteConfig.region}`,
  },
  description: `${siteConfig.name} is a platform connecting affordable and accessible housing navigators with values-aligned providers in ${siteConfig.region}.`,
};

export default async function Home() {
  // The landing page is for visitors without an account.
  const { session } = await getOptionalSession();
  if (session) {
    redirect("/listings");
  }

  return (
    <main>
      <HomeHeroSection />
      {/* Bands alternate between the page and white so each section reads as its own. */}
      <HomeBand tone="card">
        <HomeFeaturesSection />
      </HomeBand>
      <HomeBand>
        <HomeAboutSection />
        <div className="mt-16">
          <HomeScopeSection />
        </div>
      </HomeBand>
      <HomeBand tone="card">
        <HomeContactSection />
      </HomeBand>
    </main>
  );
}
