"use client";

import { Progress } from "@/components/ui/fhis/Progress";
import { Badge } from "@/components/ui/fhis/Badge";
import type { FounderJourneyProgress } from "@/lib/founder-journey/types";

interface ProgressTrackerProps {
  progress: FounderJourneyProgress;
  compact?: boolean;
}

export function ProgressTracker({ progress, compact }: ProgressTrackerProps) {
  const { milestones, completedIds, currentId, percentComplete } = progress;

  if (compact) {
    return (
      <div className="fhis-fj-progress-compact">
        <Progress value={percentComplete} label={`${percentComplete}% completado`} />
        <Badge variant="default">
          Siguiente: {milestones.find((m) => m.id === currentId)?.label ?? "—"}
        </Badge>
      </div>
    );
  }

  return (
    <div className="fhis-fj-progress">
      <div className="fhis-fj-progress-header">
        <span>Recorrido fundador</span>
        <Badge variant="accent">{percentComplete}%</Badge>
      </div>
      <Progress value={percentComplete} />
      <div className="fhis-onboarding-steps" style={{ marginTop: "var(--fhis-space-4)" }}>
        {milestones.map((m) => {
          const done = completedIds.includes(m.id);
          const active = m.id === currentId;
          return (
            <div
              key={m.id}
              className={`fhis-onboarding-step-indicator${
                done ? " fhis-onboarding-step-done" : ""
              }${active ? " fhis-onboarding-step-active" : ""}`}
              title={m.description}
            >
              <span className="fhis-onboarding-step-num">{done ? "✓" : "·"}</span>
              <span className="fhis-onboarding-step-label">{m.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
