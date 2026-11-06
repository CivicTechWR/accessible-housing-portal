import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { HomeAboutSection } from "@/components/home/HomeAboutSection";
import { HomeContactSection } from "@/components/home/HomeContactSection";
import { HomeHeroSection } from "@/components/home/HomeHeroSection";
import { HomeInfoSection } from "@/components/home/HomeInfoSection";
import { HomeScopeSection } from "@/components/home/HomeScopeSection";
import { getOptionalSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Home Hub | Affordable & Accessible Housing Rental Listings in Waterloo Region",
  description:
    "Home Hub is a platform connecting affordable and accessible housing navigators with values-aligned providers in Waterloo Region.",
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
      <div className="mx-auto max-w-5xl space-y-12 px-6 py-12 sm:py-16">
        <HomeAboutSection />
        <HomeInfoSection />
        <HomeScopeSection />
        <HomeContactSection />
      </div>
    </main>
  );
}
