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
  formatSectorRiskEs,
} from "@/lib/intelligence-network";
import type { IntelligenceNetworkSnapshot } from "@/lib/intelligence-network";
import { BenchmarksPanel, PrivacyConsentBanner } from "@/components/intelligence-network";
import { LoadingState } from "@/components/ui/LoadingState";

export function BenchmarksPageClient() {
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
        <LoadingState title="Cargando benchmarks…" description={DEMO_DISCLAIMER} />
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
            title="Benchmarks de Red"
            subtitle={PRIVACY_DISCLAIMER_ES}
          />
          <Link href="/network" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
            ← Dashboard de red
          </Link>
        </header>

        <BenchmarksPanel benchmarks={snapshot.benchmarks} />

        <Card>
          <h3>Señales de crecimiento</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {snapshot.growthSignals.map((gs) => (
              <li key={gs.id} style={{ marginBottom: "0.5rem" }}>
                {gs.label}: <strong>{gs.growthPct}%</strong>{" "}
                <Badge variant="default">conf. {Math.round(gs.confidence * 100)}%</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h3>Análisis sectorial</h3>
          <p>
            Riesgo: {formatSectorRiskEs(snapshot.sectorAnalysis.riskLevel)} ·{" "}
            {snapshot.sectorAnalysis.ventureCount} ventures en muestra
          </p>
        </Card>
      </Stack>
    </Container>
  );
}
