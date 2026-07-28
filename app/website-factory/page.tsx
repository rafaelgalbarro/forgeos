import { LegacyExperienceBanner } from "@/components/experience/LegacyExperienceBanner";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { WebsiteFactoryDashboard } from "@/components/website-factory/WebsiteFactoryDashboard";

export const metadata = {
  title: "Website Factory — ForgeOS",
  description: "Program 4400 — lab / secondary (PROGRAM 6060)",
};

export default function WebsiteFactoryPage() {
  return (
    <OsModuleFrame
      title="Website Factory"
      description="Lab / secondary — prefer Studio + Mission Control para el flujo V2"
    >
      <LegacyExperienceBanner surface="Website Factory" successorHref="/studio" successorLabel="Studio" />
      <WebsiteFactoryDashboard />
    </OsModuleFrame>
  );
}
