import { FirstExperienceHome } from "@/components/home/FirstExperienceHome";
import { loadHomeSummary } from "@/lib/home/home-summary";

export default function HomePage() {
  const homeSummary = loadHomeSummary();
  return <FirstExperienceHome homeSummary={homeSummary} />;
}
