import { LegacyExperienceBanner } from "@/components/experience/LegacyExperienceBanner";
import { MobileFactoryDashboard } from "@/components/mobile-factory/MobileFactoryDashboard";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";

export const metadata = {
  title: "Mobile Factory — ForgeOS",
  description: "Program 4600 — lab / secondary (PROGRAM 6060)",
};

export default function MobileFactoryPage() {
  return (
    <OsModuleFrame
      title="Mobile Factory"
      description="Lab / secondary — prefer Studio + Mission Control"
    >
      <LegacyExperienceBanner surface="Mobile Factory" successorHref="/studio" successorLabel="Studio" />
      <MobileFactoryDashboard />
    </OsModuleFrame>
  );
}
