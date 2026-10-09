import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { HomeContactSection } from "@/components/home/HomeContactSection";
import { HomeFAQSection } from "@/components/home/HomeFAQSection";
import { HomeHeroSection } from "@/components/home/HomeHeroSection";
import { HomeInfoSection } from "@/components/home/HomeInfoSection";
import { getOptionalSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Home Hub | Affordable & Accessible Housing Listings in Waterloo Region",
  description:
    "Home Hub connects affordable and accessible housing seekers with trusted providers in Waterloo Region. Social workers and housing providers can request access.",
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
        <HomeInfoSection />
        <HomeContactSection />
        <HomeFAQSection />
      </div>
    </main>
  );
}
