"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { VANDL_VENTURE_ID } from "@/lib/fixtures/vandl-venture";
import { ensureVandlSeeded } from "@/lib/store/vandl-seed";
import { Container, Grid, Stack } from "@/components/ui/fhis/Layout";
import { PageTemplate } from "@/components/ui/fhis/PageTemplate";
import { Timeline } from "@/components/ui/fhis/Timeline";
import {
  computeFounderJourney,
  getJourneyStoreState,
  resolveJourneyVenture,
  setJourneyVenture,
  setSelectedPhase,
} from "@/lib/founder-journey";
import type { JourneyPhaseId } from "@/lib/founder-journey";
import { JourneyProgressHeader } from "./JourneyProgressHeader";
import { JourneyTimeline } from "./JourneyTimeline";
import { JourneyPhaseCard } from "./JourneyPhaseCard";
import { cn } from "@/lib/design-system/cn";

interface FounderJourneyViewProps {
  ventureId?: string | null;
}

export function FounderJourneyView({ ventureId }: FounderJourneyViewProps) {
  const venture = useMemo(() => resolveJourneyVenture(ventureId), [ventureId]);
  const snapshot = useMemo(() => computeFounderJourney(venture), [venture]);

  const [selectedPhaseId, setSelectedPhaseId] = useState<JourneyPhaseId>(() => {
    const stored = getJourneyStoreState().selectedPhaseId;
    return stored ?? snapshot.summary.currentPhaseId;
  });

  useEffect(() => {
    ensureVandlSeeded();
    setJourneyVenture(venture.id);
  }, [venture.id]);

  const handleSelectPhase = useCallback((id: JourneyPhaseId) => {
    setSelectedPhaseId(id);
    setSelectedPhase(id);
  }, []);

  const selectedPhase =
    snapshot.phases.find((p) => p.id === selectedPhaseId) ?? snapshot.phases[0];

  const timelineItems = snapshot.timeline.map((entry) => ({
    title: entry.label,
    time: `${entry.progress}% · ${entry.time ?? ""}`,
    description: entry.description,
  }));

  return (
    <div className="immersive-root" style={{ minHeight: "100vh", background: "var(--fhis-color-bg)" }}>
      <header
        className="fhis-venture-topbar"
        style={{ borderBottom: "1px solid var(--fhis-color-line)" }}
      >
        <Link href="/" className="fhis-sidebar-logo">
          Forge<span>OS</span>
        </Link>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontSize: "var(--fhis-text-sm)", color: "var(--fhis-color-text-muted)" }}>
            Founder Journey
          </span>
        </div>
        <div style={{ display: "flex", gap: "var(--fhis-space-2)", flexWrap: "wrap" }}>
          <Link href="/founder" className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-sm")}>
            Founder
          </Link>
          <Link href="/ceo" className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-sm")}>
            CEO
          </Link>
          <Link href="/creator" className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-sm")}>
            Creator
          </Link>
          <Link href="/projects" className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-sm")}>
            Empresas
          </Link>
        </div>
      </header>

      <Container style={{ paddingTop: "var(--fhis-space-6)", paddingBottom: "var(--fhis-space-8)" }}>
        <PageTemplate title="Tu recorrido como fundador" subtitle="De la idea al lanzamiento, paso a paso.">
          <Stack gap="lg">
            <JourneyProgressHeader summary={snapshot.summary} snapshot={snapshot} />

            <JourneyTimeline
              phases={snapshot.phases}
              selectedPhaseId={selectedPhase.id}
              onSelectPhase={handleSelectPhase}
            />

            <Grid cols={2} gap="lg">
              <JourneyPhaseCard phase={selectedPhase} />
              <div>
                <p
                  style={{
                    margin: "0 0 var(--fhis-space-3)",
                    fontSize: "var(--fhis-text-sm)",
                    fontWeight: "var(--fhis-weight-semibold)",
                  }}
                >
                  Historial del recorrido
                </p>
                <div className="fhis-card fhis-card-pad-md">
                  <Timeline items={timelineItems} />
                </div>
              </div>
            </Grid>
          </Stack>
        </PageTemplate>
      </Container>
    </div>
  );
}
