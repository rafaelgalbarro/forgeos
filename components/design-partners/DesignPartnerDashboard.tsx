"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import { Grid, Panel } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { getDesignPartnerDashboardData } from "@/lib/design-partners/dashboard";
import { trackDesignPartnerEvent } from "@/lib/design-partners/analytics";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/design-partners/journey-tracker";
import type { DesignPartnerDashboardData } from "@/lib/design-partners/types";
import { readSession } from "@/lib/auth/session-store";
import { DesignPartnerShell } from "./DesignPartnerShell";
import { NpsPanel } from "./NpsPanel";
import { RetentionPanel } from "./RetentionPanel";
import { ActivationPanel } from "./ActivationPanel";

const FeedbackInbox = dynamic(() =>
  import("./FeedbackInbox").then((m) => ({ default: m.FeedbackInbox }))
);
const FeatureRequestsPanel = dynamic(() =>
  import("./FeatureRequestsPanel").then((m) => ({ default: m.FeatureRequestsPanel }))
);
const ExecutiveSummaryPanel = dynamic(() =>
  import("./ExecutiveSummaryPanel").then((m) => ({ default: m.ExecutiveSummaryPanel }))
);
const UsageAnalyticsPanel = dynamic(() =>
  import("./UsageAnalyticsPanel").then((m) => ({ default: m.UsageAnalyticsPanel }))
);

type Tab = "overview" | "feedback" | "features" | "executive" | "analytics" | "journey";

export function DesignPartnerDashboard() {
  const [data, setData] = useState<DesignPartnerDashboardData | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  const refresh = useCallback(() => {
    setData(getDesignPartnerDashboardData());
  }, []);

  useEffect(() => {
    const session = readSession();
    trackDesignPartnerEvent({
      event: "dp_dashboard_view",
      path: "/design-partners",
      userId: session?.userId,
      workspaceId: session?.activeWorkspaceId,
    });
    refresh();
  }, [refresh]);

  const journey = data?.journey;
  const health = data?.health;

  return (
    <DesignPartnerShell
      title="Design Partner Dashboard"
      description="Hub para design partners — hipótesis, feedback, journey y métricas de producto"
    >
      {data && (
        <>
          <div className="fhis-beta-dashboard-header">
            <Badge variant={data.partnerMode ? "accent" : "default"}>
              {data.partnerMode ? "Modo Design Partner activo" : "Modo estándar"}
            </Badge>
            {health && (
              <Badge variant={health.tier === "at-risk" ? "default" : "accent"}>
                Salud: {health.score} ({health.tier})
              </Badge>
            )}
          </div>

          <div className="fhis-beta-tabs">
            {(
              [
                ["overview", "Resumen"],
                ["journey", "Journey"],
                ["feedback", "Inbox"],
                ["features", "Features"],
                ["executive", "Ejecutivo"],
                ["analytics", "Analytics"],
              ] as const
            ).map(([t, label]) => (
              <Button
                key={t}
                size="sm"
                variant={tab === t ? "primary" : "ghost"}
                onClick={() => setTab(t)}
              >
                {label}
              </Button>
            ))}
          </div>

          {tab === "overview" && (
            <Grid cols={4} gap="md" className="fhis-beta-kpi-grid">
              <Panel className="fhis-beta-kpi">
                <span className="fhis-beta-stat-value">{data.feedbackCount}</span>
                <span className="fhis-beta-stat-label">Feedbacks</span>
              </Panel>
              <Panel className="fhis-beta-kpi">
                <span className="fhis-beta-stat-value">{data.issueCount}</span>
                <span className="fhis-beta-stat-label">Issues</span>
              </Panel>
              <Panel className="fhis-beta-kpi">
                <span className="fhis-beta-stat-value">{data.featureRequestCount}</span>
                <span className="fhis-beta-stat-label">Feature requests</span>
              </Panel>
              <Panel className="fhis-beta-kpi">
                <span className="fhis-beta-stat-value">{data.pendingInvites}</span>
                <span className="fhis-beta-stat-label">Invitaciones pendientes</span>
              </Panel>
            </Grid>
          )}

          {tab === "overview" && (
            <Grid cols={3} gap="md" className="fhis-beta-kpi-grid">
              <NpsPanel data={data.success.nps} />
              <RetentionPanel data={data.success.retention} />
              <ActivationPanel data={data.success.activation} />
            </Grid>
          )}

          {tab === "journey" && journey && (
            <Panel>
              <h3 className="fhis-beta-panel-title">
                Journey: {STAGE_LABELS[journey.currentStage]}
              </h3>
              <div className="fhis-beta-tabs">
                {STAGE_ORDER.map((stage) => (
                  <Badge
                    key={stage}
                    variant={journey.completedStages.includes(stage) ? "accent" : "default"}
                  >
                    {STAGE_LABELS[stage]}
                  </Badge>
                ))}
              </div>
            </Panel>
          )}

          {tab === "feedback" && <FeedbackInbox />}
          {tab === "features" && <FeatureRequestsPanel />}
          {tab === "executive" && <ExecutiveSummaryPanel />}
          {tab === "analytics" && <UsageAnalyticsPanel />}
        </>
      )}
    </DesignPartnerShell>
  );
}
