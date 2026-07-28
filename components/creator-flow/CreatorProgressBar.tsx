"use client";

import { Progress } from "@/components/ui/fhis/Progress";
import type { CreatorFlowSummary } from "@/lib/creator-flow";

interface CreatorProgressBarProps {
  summary: CreatorFlowSummary;
}

export function CreatorProgressBar({ summary }: CreatorProgressBarProps) {
  return (
    <div
      className="fhis-panel"
      style={{
        padding: "var(--fhis-space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--fhis-space-3)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: "var(--fhis-space-2)",
        }}
      >
        <div>
          <div style={{ fontSize: "var(--fhis-text-sm)", color: "var(--fhis-color-text-muted)" }}>
            Progreso global
          </div>
          <div style={{ fontSize: "var(--fhis-text-lg)", fontWeight: "var(--fhis-weight-semibold)" }}>
            {summary.ventureName}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "var(--fhis-text-sm)", color: "var(--fhis-color-text-muted)" }}>
            Paso actual
          </div>
          <div style={{ fontWeight: "var(--fhis-weight-semibold)", color: "var(--fhis-color-accent)" }}>
            {summary.currentStepLabel}
          </div>
        </div>
      </div>

      <Progress
        value={summary.overallProgress}
        showValue
        label={`${summary.stepsComplete}/${summary.stepsTotal} pasos · ${summary.estimatedTimeRemaining} restantes`}
      />
    </div>
  );
}
