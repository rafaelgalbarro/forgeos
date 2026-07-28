import type { Metadata } from "next";
import { InteractiveDemo } from "@/components/launch/InteractiveDemo";
import { LaunchNav } from "@/components/launch/LaunchNav";
import { FeedbackWidget } from "@/components/launch/FeedbackWidget";
import { Container } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";

export const metadata: Metadata = {
  title: "Demo interactiva — ForgeOS",
  description: "Tour de producto y demo interactiva de ForgeOS 1.0.",
};

export default function DemoRoute() {
  return (
    <div className="fhis-launch-page">
      <LaunchNav />
      <FeedbackWidget />
      <Container className="fhis-demo-page">
        <SectionHeader
          title="Demo interactiva"
          description="Explora ForgeOS 1.0 con tour guiado y escenarios de producto"
        />
        <InteractiveDemo />
      </Container>
    </div>
  );
}
