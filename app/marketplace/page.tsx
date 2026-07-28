import Link from "next/link";
import { EcosystemMarketplaceView } from "@/components/ecosystem/EcosystemMarketplaceView";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";

export const metadata = {
  title: "Marketplace — ForgeOS",
  description: "RC9 Ecosystem Marketplace + PROGRAM 4700 AI Agents Marketplace",
};

export default function MarketplacePage() {
  return (
    <Stack gap="lg">
      <Container>
        <Panel>
          <SectionHeader
            title="ForgeOS Marketplace"
            subtitle="Hub central — Ecosystem Packs y Agentes IA"
          />
          <nav className="fhis-marketplace-hub-links">
            <Link href="/marketplace/agents" className="fhis-btn fhis-btn-primary">
              AI Agents Marketplace (PROGRAM 4700)
            </Link>
          </nav>
        </Panel>
      </Container>
      <EcosystemMarketplaceView />
    </Stack>
  );
}
