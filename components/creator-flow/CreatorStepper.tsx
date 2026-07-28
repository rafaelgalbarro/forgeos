"use client";

import { cn } from "@/lib/design-system/cn";
import type { CreatorStepId, CreatorStepSnapshot } from "@/lib/creator-flow";

interface CreatorStepperProps {
  steps: CreatorStepSnapshot[];
  selectedStepId: CreatorStepId;
  onSelectStep: (id: CreatorStepId) => void;
  orientation?: "horizontal" | "vertical";
}

const STATUS_DOT: Record<CreatorStepSnapshot["status"], string> = {
  complete: "var(--fhis-color-green)",
  active: "var(--fhis-color-accent)",
  blocked: "var(--fhis-color-red)",
  pending: "var(--fhis-color-line)",
};

export function CreatorStepper({
  steps,
  selectedStepId,
  onSelectStep,
  orientation = "horizontal",
}: CreatorStepperProps) {
  const isVertical = orientation === "vertical";

  return (
    <div
      className="fhis-panel"
      style={{
        padding: "var(--fhis-space-4)",
        overflowX: isVertical ? undefined : "auto",
      }}
      role="tablist"
      aria-label="Creator Flow pipeline"
    >
      <div
        style={{
          display: isVertical ? "flex" : "flex",
          flexDirection: isVertical ? "column" : "row",
          gap: "var(--fhis-space-2)",
          minWidth: isVertical ? undefined : "max-content",
        }}
      >
        {steps.map((step, index) => {
          const selected = step.id === selectedStepId;
          return (
            <button
              key={step.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelectStep(step.id)}
              className={cn("fhis-card", selected && "fhis-card-elevated")}
              style={{
                minWidth: isVertical ? undefined : 96,
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
                  background: STATUS_DOT[step.status],
                  marginBottom: "var(--fhis-space-2)",
                }}
              />
              <div
                style={{
                  fontSize: "var(--fhis-text-sm)",
                  fontWeight: "var(--fhis-weight-semibold)",
                }}
              >
                {step.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
