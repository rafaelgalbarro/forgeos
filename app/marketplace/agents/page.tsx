import { PageHeader } from "@/components/layout/PageHeader";
import { AgentCatalog } from "@/components/marketplace/AgentCatalog";
import { buildMarketplaceCatalog } from "@/lib/agents-marketplace/marketplace-catalog";

export const metadata = {
  title: "Agentes IA — Marketplace — ForgeOS",
  description: "PROGRAM 4700 — Catálogo de agentes IA ejecutivos y operativos",
};

export default function AgentsMarketplacePage() {
  const catalog = buildMarketplaceCatalog();

  return (
    <section>
      <PageHeader
        badge="PROGRAM 4700"
        title="AI Agents Marketplace"
        description="Catálogo extensible de agentes IA — instalación por registro, sin nueva ejecución de IA."
      />
      <AgentCatalog catalog={catalog} />
    </section>
  );
}
