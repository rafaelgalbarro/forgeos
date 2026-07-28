"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { COMPANY_WORKSPACES } from "@/lib/mission-control/autonomous-company/company-workspaces";
import type { CompanyWorkspaceId, CompanyWorkspacesSnapshot } from "@/lib/mission-control/autonomous-company/types";

const MarketingWorkspace = dynamic(
  () => import("./MarketingWorkspace").then((m) => m.MarketingWorkspace),
  { ssr: false, loading: () => <div style={{ padding: 16 }}>Cargando marketing…</div> }
);
const SEOWorkspace = dynamic(() => import("./SEOWorkspace").then((m) => m.SEOWorkspace), {
  ssr: false,
  loading: () => <div style={{ padding: 16 }}>Cargando SEO…</div>,
});
const RoadmapWorkspace = dynamic(
  () => import("./RoadmapWorkspace").then((m) => m.RoadmapWorkspace),
  { ssr: false, loading: () => <div style={{ padding: 16 }}>Cargando roadmap…</div> }
);
const CustomerFeedbackPanel = dynamic(
  () => import("./CustomerFeedbackPanel").then((m) => m.CustomerFeedbackPanel),
  { ssr: false, loading: () => <div style={{ padding: 16 }}>Cargando feedback…</div> }
);
const NPSPanel = dynamic(() => import("./NPSPanel").then((m) => m.NPSPanel), {
  ssr: false,
  loading: () => <div style={{ padding: 16 }}>Cargando NPS…</div>,
});
const KPIsPanel = dynamic(() => import("./KPIsPanel").then((m) => m.KPIsPanel), {
  ssr: false,
  loading: () => <div style={{ padding: 16 }}>Cargando KPIs…</div>,
});
const ProductMetricsPanel = dynamic(
  () => import("./ProductMetricsPanel").then((m) => m.ProductMetricsPanel),
  { ssr: false, loading: () => <div style={{ padding: 16 }}>Cargando métricas…</div> }
);
const BacklogPanel = dynamic(() => import("./BacklogPanel").then((m) => m.BacklogPanel), {
  ssr: false,
  loading: () => <div style={{ padding: 16 }}>Cargando backlog…</div>,
});
const IncidentsPanel = dynamic(
  () => import("./IncidentsPanel").then((m) => m.IncidentsPanel),
  { ssr: false, loading: () => <div style={{ padding: 16 }}>Cargando incidentes…</div> }
);

interface Props {
  snapshot: CompanyWorkspacesSnapshot;
}

function renderWorkspace(id: CompanyWorkspaceId, snapshot: CompanyWorkspacesSnapshot) {
  switch (id) {
    case "marketing":
      return <MarketingWorkspace snapshot={snapshot} />;
    case "seo":
      return <SEOWorkspace snapshot={snapshot} />;
    case "roadmap":
      return <RoadmapWorkspace snapshot={snapshot} />;
    case "customerFeedback":
      return <CustomerFeedbackPanel snapshot={snapshot} />;
    case "nps":
      return <NPSPanel snapshot={snapshot} />;
    case "kpis":
      return <KPIsPanel snapshot={snapshot} />;
    case "productMetrics":
      return <ProductMetricsPanel snapshot={snapshot} />;
    case "backlog":
      return <BacklogPanel snapshot={snapshot} />;
    case "incidents":
      return <IncidentsPanel snapshot={snapshot} />;
    default:
      return null;
  }
}

export function CompanyWorkspacesPanel({ snapshot }: Props) {
  const [activeTab, setActiveTab] = useState<CompanyWorkspaceId>("marketing");
  const activeWorkspace = COMPANY_WORKSPACES.find((w) => w.id === activeTab);

  return (
    <Panel className="fhis-mc-company-panel">
      <Stack gap="md">
        <SectionHeader
          title="Gestión Empresa"
          subtitle="Post-deploy — OPERATE / EVOLVE"
        />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            borderBottom: "1px solid var(--fhis-color-border)",
            paddingBottom: 8,
          }}
        >
          {COMPANY_WORKSPACES.map((ws) => {
            const panel = snapshot.panels[ws.id];
            return (
              <button
                key={ws.id}
                type="button"
                onClick={() => setActiveTab(ws.id)}
                style={{
                  padding: "6px 10px",
                  fontSize: "0.75rem",
                  border: "1px solid var(--fhis-color-border)",
                  borderRadius: 6,
                  background: activeTab === ws.id ? "var(--fhis-color-accent-muted)" : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span>{ws.icon}</span>
                <span>{ws.labelEs}</span>
                {panel && !panel.empty && <Badge variant="accent">●</Badge>}
              </button>
            );
          })}
        </div>
        {activeWorkspace && (
          <p style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)", margin: 0 }}>
            {activeWorkspace.description} · {snapshot.panels[activeTab]?.summary}
          </p>
        )}
        {renderWorkspace(activeTab, snapshot)}
      </Stack>
    </Panel>
  );
}
