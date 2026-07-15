import { HomeContactSection } from "@/components/home/HomeContactSection";
import { HomeHeroSection } from "@/components/home/HomeHeroSection";
import { HomeInfoSection } from "@/components/home/HomeInfoSection";
import { HomeFAQSection } from "@/components/home/HomeFAQSection";

export default function App() {
  return (
    <main>
      <HomeHeroSection />
      <HomeInfoSection />
      <HomeFAQSection />
      <HomeContactSection />
    </main>
  );
}
