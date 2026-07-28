"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/fhis/Badge";
import { Progress } from "@/components/ui/fhis/Progress";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Grid, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import type { JourneySummary } from "@/lib/founder-journey";
import { computeUserPipelineProgress } from "@/lib/founder-journey";
import type { FounderJourneySnapshot } from "@/lib/founder-journey";
import { cn } from "@/lib/design-system/cn";

interface JourneyProgressHeaderProps {
  summary: JourneySummary;
  snapshot: FounderJourneySnapshot;
}

export function JourneyProgressHeader({ summary, snapshot }: JourneyProgressHeaderProps) {
  const pipeline = computeUserPipelineProgress(snapshot);

  return (
    <Stack gap="lg">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--fhis-space-4)", flexWrap: "wrap" }}>
        <SectionHeader
          title={summary.ventureName}
          description="ForgeOS te acompaña desde la idea hasta el lanzamiento — sin exponer runtime ni workers."
        />
        <Link
          href={`/intelligence/${summary.ventureId}`}
          className={cn("fhis-btn", "fhis-btn-secondary", "fhis-btn-sm")}
        >
          Continuar venture
        </Link>
      </div>

      <Progress value={summary.overallProgress} label="Progreso global" showValue />

      <Grid cols={4} gap="md">
        <KpiBlock label="Fase actual" value={summary.currentPhaseLabel} />
        <KpiBlock label="Fases completadas" value={`${summary.phasesComplete}/${summary.phasesTotal}`} />
        <KpiBlock label="Tiempo estimado" value={summary.estimatedTimeRemaining} />
        <KpiBlock label="Valor generado" value={summary.totalValueGenerated} />
      </Grid>

      <div>
        <p style={{ fontSize: "var(--fhis-text-xs)", color: "var(--fhis-color-text-muted)", marginBottom: "var(--fhis-space-2)" }}>
          Vista resumida (pipeline fundador)
        </p>
        <div className="fhis-pipeline">
          {pipeline.map((step) => (
            <div
              key={step.id}
              className={cn("fhis-pipeline-stage", step.active && "fhis-pipeline-stage-active")}
            >
              <div className="fhis-pipeline-stage-title">{step.label}</div>
              <div className="fhis-pipeline-stage-count">{step.progress}%</div>
              {step.active && (
                <Badge variant="accent" className="fhis-mt-2">
                  En curso
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    </Stack>
  );
}
