"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/fhis/Badge";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { AgentCapabilities } from "./AgentCapabilities";
import { AgentVersionHistory } from "./AgentVersionHistory";
import type { AgentDetailView } from "@/lib/agents-marketplace/types";

const AgentInstallPanel = dynamic(
  () => import("./AgentInstallPanel").then((m) => m.AgentInstallPanel),
  { loading: () => <Panel><p className="fhis-muted">Cargando panel de instalación…</p></Panel> }
);

const STATUS_LABELS: Record<string, string> = {
  available: "Disponible",
  installed: "Instalado",
  beta: "Beta",
  "coming-soon": "Próximamente",
  deprecated: "Obsoleto",
};

interface AgentDetailProps {
  agent: AgentDetailView;
}

export function AgentDetail({ agent }: AgentDetailProps) {
  return (
    <Container>
      <Stack gap="lg">
        <nav className="fhis-breadcrumb">
          <Link href="/marketplace/agents">← Catálogo de Agentes</Link>
        </nav>

        <header className="fhis-agent-detail-header">
          <span className="fhis-agent-icon-lg" aria-hidden>{agent.icon}</span>
          <div>
            <SectionHeader title={agent.name} subtitle={agent.role} />
            <div className="fhis-agent-detail-badges">
              <Badge variant="blue">{STATUS_LABELS[agent.status] ?? agent.status}</Badge>
              <Badge variant="default">v{agent.version}</Badge>
              <Badge variant="default">{agent.department}</Badge>
            </div>
          </div>
        </header>

        <p>{agent.description}</p>

        <Panel>
          <div className="fhis-ecosystem-kpi-grid">
            <KpiBlock label="Coste estimado/mes" value={`${agent.estimatedCostPerMonth} €`} />
            <KpiBlock label="Coste por llamada" value={`${agent.estimatedCostPerCall} €`} />
            <KpiBlock label="Proveedor IA" value={agent.recommendedProvider} />
            <KpiBlock
              label="Modelo sugerido"
              value={agent.runtimeHints.suggestedModel ?? "—"}
            />
          </div>
        </Panel>

        <Grid cols={2} gap="md">
          <AgentInstallPanel
            agentId={agent.id}
            agentName={agent.name}
            version={agent.latestVersion.version}
          />
          <Panel>
            <SectionHeader title="Runtime IA" subtitle="Adaptador de solo lectura (AI Runtime)" />
            <ul className="fhis-agent-runtime-hints">
              <li>
                Real AI:{" "}
                <Badge variant={agent.runtimeHints.realAiEnabled ? "accent" : "default"}>
                  {agent.runtimeHints.realAiEnabled ? "Activo" : "Sandbox"}
                </Badge>
              </li>
              <li>
                Proveedor configurado:{" "}
                <Badge variant={agent.runtimeHints.providerConfigured ? "blue" : "amber"}>
                  {agent.runtimeHints.providerConfigured ? "Sí" : "No"}
                </Badge>
              </li>
              <li>AI Task: <code>{agent.aiTask}</code></li>
            </ul>
          </Panel>
        </Grid>

        <AgentCapabilities capabilities={agent.capabilities} skills={agent.skills} />
        <AgentVersionHistory versions={agent.versions} currentVersion={agent.version} />
      </Stack>
    </Container>
  );
}
