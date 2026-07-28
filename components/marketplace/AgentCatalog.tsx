import { AgentCard } from "./AgentCard";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import type { MarketplaceCatalog } from "@/lib/agents-marketplace/types";

interface AgentCatalogProps {
  catalog: MarketplaceCatalog;
}

export function AgentCatalog({ catalog }: AgentCatalogProps) {
  return (
    <Container>
      <Stack gap="lg">
        <SectionHeader
          title="Catálogo de Agentes IA"
          subtitle="PROGRAM 4700 — Marketplace extensible de agentes ejecutivos y operativos"
        />

        <Panel>
          <div className="fhis-ecosystem-kpi-grid">
            <KpiBlock label="Total agentes" value={String(catalog.total)} />
            <KpiBlock label="Disponibles" value={String(catalog.available)} />
            <KpiBlock label="Beta" value={String(catalog.beta)} />
            <KpiBlock label="Instalados" value={String(catalog.installed)} />
          </div>
        </Panel>

        <Grid cols={3} gap="md">
          {catalog.agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </Grid>
      </Stack>
    </Container>
  );
}
