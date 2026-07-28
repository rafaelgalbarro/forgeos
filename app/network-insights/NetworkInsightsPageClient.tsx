"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Container, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Card } from "@/components/ui/fhis/Card";
import {
  runIntelligenceNetwork,
  createDefaultIntelligenceContext,
  DEMO_DISCLAIMER,
  PRIVACY_DISCLAIMER_ES,
} from "@/lib/intelligence-network";
import type { IntelligenceNetworkSnapshot } from "@/lib/intelligence-network";
import { NetworkInsightsPanel } from "@/components/intelligence-network";
import { PrivacyConsentBanner } from "@/components/intelligence-network";
import { LoadingState } from "@/components/ui/LoadingState";

export function NetworkInsightsPageClient() {
  const [snapshot, setSnapshot] = useState<IntelligenceNetworkSnapshot | null>(null);

  const refresh = useCallback(() => {
    setSnapshot(runIntelligenceNetwork(createDefaultIntelligenceContext()));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!snapshot) {
    return (
      <Container>
        <LoadingState title="Cargando insights de red…" description={DEMO_DISCLAIMER} />
      </Container>
    );
  }

  return (
    <Container>
      <Stack gap="lg">
        <PrivacyConsentBanner consent={snapshot.consent} onConsentChange={() => refresh()} />
        <header>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Badge variant="accent">Program 9000</Badge>
            <Badge variant="amber">{DEMO_DISCLAIMER}</Badge>
          </div>
          <SectionHeader
            title="Insights de Red"
            subtitle={PRIVACY_DISCLAIMER_ES}
          />
          <Link href="/network" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
            ← Dashboard de red
          </Link>
        </header>

        <Card>
          <h3>Análisis sectorial</h3>
          <p>
            Sector <strong>{snapshot.sectorAnalysis.sector}</strong> ·{" "}
            {snapshot.sectorAnalysis.ventureCount} ventures · Crecimiento mediano{" "}
            {snapshot.sectorAnalysis.medianGrowthPct}%
          </p>
          <p>Oportunidad principal: {snapshot.sectorAnalysis.topOpportunity}</p>
        </Card>

        <NetworkInsightsPanel
          insights={snapshot.insights}
          executiveInsights={snapshot.executiveInsights}
          recommendations={snapshot.aiRecommendations}
          signals={snapshot.marketSignals}
          opportunities={snapshot.opportunities}
        />

        <Card>
          <h3>Patrones detectados</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {snapshot.patterns.map((p) => (
              <li key={p.id} style={{ marginBottom: "0.5rem" }}>
                <strong>{p.name}</strong> ({p.frequencyPct}% en red) — {p.description}
              </li>
            ))}
          </ul>
        </Card>
      </Stack>
    </Container>
  );
}
