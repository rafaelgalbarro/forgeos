"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Notification } from "@/components/ui/fhis/Notification";
import {
  runNetworkEngine,
  createDefaultNetworkContext,
  DEMO_DISCLAIMER,
  NETWORK_ENGINE_VERSION,
} from "@/lib/network";
import type { NetworkSnapshot } from "@/lib/network/types";
import { ConsentPanel } from "./ConsentPanel";
import { BenchmarkPanel } from "./BenchmarkPanel";
import { InsightsPanel } from "./InsightsPanel";
import { LoadingState } from "@/components/ui/LoadingState";

interface Props {
  showLabLink?: boolean;
}

export function NetworkDashboardView({ showLabLink = false }: Props) {
  const [snapshot, setSnapshot] = useState<NetworkSnapshot | null>(null);

  const refresh = useCallback(() => {
    const ctx = createDefaultNetworkContext();
    setSnapshot(runNetworkEngine(ctx));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const topRec = useMemo(
    () => snapshot?.recommendations[0],
    [snapshot]
  );

  if (!snapshot) {
    return (
      <Container>
        <LoadingState title="Cargando Network…" description={DEMO_DISCLAIMER} />
      </Container>
    );
  }

  return (
    <Container className="fhis-network-dashboard">
      <Stack gap="lg">
        <Notification
          variant="warning"
          title={DEMO_DISCLAIMER}
          body="Todos los datos de red son simulados. No se comparten datos privados ni se mezclan organizaciones hasta que exista red real con consentimiento."
        />

        <header className="fhis-network-header">
          <div className="fhis-network-badges">
            <Badge variant="accent">RC10</Badge>
            <Badge variant="default">ForgeOS Network</Badge>
            <Badge variant="amber">{DEMO_DISCLAIMER}</Badge>
          </div>
          <SectionHeader
            title="Red de Inteligencia Colectiva"
            subtitle="Benchmarks agregados, señales de mercado, mejores prácticas y oportunidades — con aislamiento y consentimiento explícito"
          />
          {showLabLink && (
            <Link href="/lab/network" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
              Lab harness →
            </Link>
          )}
        </header>

        <Panel className="fhis-network-demo-banner">
          <p className="fhis-network-demo-text">{snapshot.executiveSummaryEs}</p>
          {topRec && (
            <p className="fhis-network-demo-impact">
              Impacto estimado: <strong>{topRec.impactEstimate}</strong>
            </p>
          )}
        </Panel>

        <div className="fhis-network-kpi-row">
          <KpiBlock label="Crecimiento sector" value={`${snapshot.benchmarks.growthRatePct}%`} delta={21} />
          <KpiBlock label="Ventures en red" value={String(snapshot.benchmarks.sampleSize)} />
          <KpiBlock label="Señales activas" value={String(snapshot.signals.length)} delta={4} />
          <KpiBlock label="Oportunidades" value={String(snapshot.opportunities.length)} delta={14} />
        </div>

        <div className="fhis-network-main-grid">
          <BenchmarkPanel benchmarks={snapshot.benchmarks} />
          <ConsentPanel
            consent={snapshot.consent}
            onUpdate={() => refresh()}
          />
        </div>

        <InsightsPanel
          insights={snapshot.insights}
          recommendations={snapshot.recommendations}
          signals={snapshot.signals}
          opportunities={snapshot.opportunities}
        />

        <footer className="fhis-network-footer">
          <span>Engine {NETWORK_ENGINE_VERSION}</span>
          <span>·</span>
          <span>Org: {snapshot.organizationId}</span>
          <span>·</span>
          <span>Contribución: {snapshot.canContribute ? "habilitada" : "solo lectura"}</span>
        </footer>
      </Stack>
    </Container>
  );
}
