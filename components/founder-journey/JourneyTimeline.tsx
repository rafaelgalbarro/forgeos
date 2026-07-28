"use client";

import { cn } from "@/lib/design-system/cn";
import type { JourneyPhaseId, JourneyPhaseState } from "@/lib/founder-journey";

interface JourneyTimelineProps {
  phases: JourneyPhaseState[];
  selectedPhaseId: JourneyPhaseId;
  onSelectPhase: (id: JourneyPhaseId) => void;
}

const STATUS_DOT: Record<JourneyPhaseState["status"], string> = {
  complete: "var(--fhis-color-green)",
  active: "var(--fhis-color-accent)",
  blocked: "var(--fhis-color-red)",
  pending: "var(--fhis-color-line)",
};

export function JourneyTimeline({ phases, selectedPhaseId, onSelectPhase }: JourneyTimelineProps) {
  return (
    <div
      className="fhis-panel"
      style={{ padding: "var(--fhis-space-4)", overflowX: "auto" }}
      role="tablist"
      aria-label="Fases del Founder Journey"
    >
      <div
        style={{
          display: "flex",
          gap: "var(--fhis-space-2)",
          minWidth: "max-content",
          paddingBottom: "var(--fhis-space-2)",
        }}
      >
        {phases.map((phase, index) => {
          const selected = phase.id === selectedPhaseId;
          return (
            <button
              key={phase.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelectPhase(phase.id)}
              className={cn("fhis-card", selected && "fhis-card-elevated")}
              style={{
                minWidth: 108,
                textAlign: "left",
                cursor: "pointer",
                border: selected
                  ? "1px solid var(--fhis-color-accent)"
                  : "1px solid var(--fhis-color-line)",
                background: selected ? "var(--fhis-color-accent-dim)" : "var(--fhis-color-panel)",
                padding: "var(--fhis-space-3)",
              }}
            >
              <div
                style={{
                  fontSize: "var(--fhis-text-xs)",
                  color: "var(--fhis-color-text-muted)",
                  marginBottom: "var(--fhis-space-1)",
                }}
              >
                {String(index + 1).padStart(2, "0")}
              </div>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: STATUS_DOT[phase.status],
                  marginBottom: "var(--fhis-space-2)",
                }}
              />
              <div
                style={{
                  fontSize: "var(--fhis-text-sm)",
                  fontWeight: "var(--fhis-weight-semibold)",
                  marginBottom: "var(--fhis-space-1)",
                }}
              >
                {phase.label}
              </div>
              <div style={{ fontSize: "var(--fhis-text-xs)", color: "var(--fhis-color-text-muted)" }}>
                {phase.progress}%
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
