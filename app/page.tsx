import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { HomeFeaturesSection } from "@/components/home/HomeFeaturesSection";
import { HomeAboutSection } from "@/components/home/HomeAboutSection";
import { HomeContactSection } from "@/components/home/HomeContactSection";
import { HomeHeroSection } from "@/components/home/HomeHeroSection";
import { HomeInfoSection } from "@/components/home/HomeInfoSection";
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
      <div className="mx-auto max-w-6xl space-y-16 px-4 py-16 sm:space-y-20 sm:px-6 sm:py-20">
        <HomeAboutSection />
        <HomeFeaturesSection />
        <HomeInfoSection />
        <HomeScopeSection />
        <HomeContactSection />
      </div>
    </main>
  );
}
