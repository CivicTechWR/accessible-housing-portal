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
      {/* Bands alternate between the page and muted backgrounds so each section reads as its own. The
          last band is blue, like the hero's sign. */}
      <HomeBand tone="muted">
        <HomeFeaturesSection />
      </HomeBand>
      <HomeBand>
        <HomeAboutSection />
      </HomeBand>
      <HomeBand tone="muted">
        <HomeScopeSection />
      </HomeBand>
      <HomeBand tone="sign">
        <HomeContactSection />
      </HomeBand>
    </main>
  );
}
