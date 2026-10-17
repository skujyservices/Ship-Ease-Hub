import { HomeSections, SiteNav } from "@/components/marketing/Editorial";
import { HomeHero } from "@/components/marketing/HomeHero";

/* Direction D · Editorial Routes (chosen). This is now the live home page; kept here for comparison. */

export default function DirectionD() {
  return (
    <div className="bg-white text-navy">
      <SiteNav home="/design/d" />
      <HomeHero />
      <HomeSections />
    </div>
  );
}
