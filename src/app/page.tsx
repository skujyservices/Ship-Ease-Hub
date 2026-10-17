import { HomeSections, SiteNav } from "@/components/marketing/Editorial";
import { HomeHero } from "@/components/marketing/HomeHero";

export default function Home() {
  return (
    <div className="bg-white text-navy">
      <SiteNav />
      <main>
        <HomeHero />
        <HomeSections />
      </main>
    </div>
  );
}
