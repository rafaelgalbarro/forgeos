import type { Metadata } from "next";
import { CommunityHub } from "@/components/launch/CommunityHub";
import { LaunchNav } from "@/components/launch/LaunchNav";
import { FeedbackWidget } from "@/components/launch/FeedbackWidget";
import { Container } from "@/components/ui/fhis/Layout";

export const metadata: Metadata = {
  title: "Comunidad — ForgeOS",
  description: "Comunidad, foro, contacto y legal hub de ForgeOS 1.0.",
};

export default function CommunityRoute() {
  return (
    <div className="fhis-launch-page">
      <LaunchNav />
      <FeedbackWidget />
      <Container className="fhis-community-page">
        <CommunityHub />
      </Container>
    </div>
  );
}
