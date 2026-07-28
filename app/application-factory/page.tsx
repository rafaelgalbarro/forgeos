import { ApplicationFactoryDashboard } from "@/components/application-factory/ApplicationFactoryDashboard";
import { LegacyExperienceBanner } from "@/components/experience/LegacyExperienceBanner";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";

export const metadata = {
  title: "Application Factory — ForgeOS",
  description: "Program 4500 — lab / secondary (PROGRAM 6060)",
};

export default function ApplicationFactoryPage() {
  return (
    <OsModuleFrame
      title="Application Factory"
      description="Lab / secondary — prefer Studio + Mission Control"
    >
      <LegacyExperienceBanner surface="Application Factory" successorHref="/studio" successorLabel="Studio" />
      <ApplicationFactoryDashboard />
    </OsModuleFrame>
  );
}
