"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import {
  runIntelligenceNetwork,
  createDefaultIntelligenceContext,
  DEMO_DISCLAIMER,
  PRIVACY_DISCLAIMER_ES,
  getIntelligenceNetworkVersion,
} from "@/lib/intelligence-network";
import type { IntelligenceNetworkSnapshot } from "@/lib/intelligence-network";
import { PrivacyConsentBanner } from "./PrivacyConsentBanner";
import { AnonymizedMetricsPanel } from "./AnonymizedMetricsPanel";
import { BenchmarksPanel } from "./BenchmarksPanel";
import { NetworkInsightsPanel } from "./NetworkInsightsPanel";
import { LoadingState } from "@/components/ui/LoadingState";

interface Props {
  showLabLink?: boolean;
}

export function NetworkDashboard({ showLabLink = false }: Props) {
  const [snapshot, setSnapshot] = useState<IntelligenceNetworkSnapshot | null>(null);

  const refresh = useCallback(() => {
    const ctx = createDefaultIntelligenceContext();
    setSnapshot(runIntelligenceNetwork(ctx));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const topRec = useMemo(() => snapshot?.aiRecommendations[0], [snapshot]);

  if (!snapshot) {
    return (
      <Container>
        <LoadingState title="Cargando Intelligence Network…" description={DEMO_DISCLAIMER} />
      </Container>
    );
  }

  return (
    <Container className="fhis-network-dashboard">
      <Stack gap="lg">
        <PrivacyConsentBanner
          consent={snapshot.consent}
          onConsentChange={() => refresh()}
        />

        <header className="fhis-network-header">
          <div className="fhis-network-badges">
            <Badge variant="accent">Program 9000</Badge>
            <Badge variant="default">Intelligence Network</Badge>
            <Badge variant="amber">{DEMO_DISCLAIMER}</Badge>
          </div>
          <SectionHeader
            title="Red de Inteligencia Colectiva"
            subtitle={PRIVACY_DISCLAIMER_ES}
          />
          <nav className="fhis-network-nav" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/network-insights" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
              Insights →
            </Link>
            <Link href="/benchmarks" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
              Benchmarks →
            </Link>
            <Link href="/playbooks" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
              Playbooks →
            </Link>
            {showLabLink && (
              <Link href="/lab/network" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
                Lab harness →
              </Link>
            )}
          </nav>
        </header>

        <Panel className="fhis-network-demo-banner">
          <p className="fhis-network-demo-text">{snapshot.executiveSummaryEs}</p>
          {topRec && (
            <p className="fhis-network-demo-impact">
              Impacto estimado: <strong>{topRec.impactEstimate}</strong>
            </p>
          )}
        </Panel>

        <div className="fhis-network-kpi-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem" }}>
          {snapshot.dashboard.kpis.map((kpi) => (
            <KpiBlock key={kpi.label} label={kpi.label} value={kpi.value} delta={kpi.delta} />
          ))}
        </div>

        <div className="fhis-network-main-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <BenchmarksPanel benchmarks={snapshot.benchmarks} />
          <AnonymizedMetricsPanel metrics={snapshot.anonymousMetrics} />
        </div>

        <NetworkInsightsPanel
          insights={snapshot.insights}
          executiveInsights={snapshot.executiveInsights}
          recommendations={snapshot.aiRecommendations}
          signals={snapshot.marketSignals}
          opportunities={snapshot.opportunities}
        />

        <footer className="fhis-network-footer" style={{ fontSize: "0.85rem", opacity: 0.7 }}>
          <span>Program 9000 v{getIntelligenceNetworkVersion()}</span>
          <span> · </span>
          <span>Org: {snapshot.organizationId}</span>
          <span> · </span>
          <span>Workspace: {snapshot.workspaceId}</span>
          <span> · </span>
          <span>Estado: {snapshot.dashboard.privacyStatus}</span>
        </footer>
      </Stack>
    </Container>
  );
}
