"use client";

import type { FounderLifecycleStep } from "@/lib/venture-workspace/types";
import { cn } from "@/lib/design-system/cn";

interface FounderLifecyclePipelineProps {
  steps: FounderLifecycleStep[];
}

function stepStatusText(status: FounderLifecycleStep["status"]): string {
  if (status === "complete") return "Completado";
  if (status === "active") return "En curso";
  if (status === "blocked") return "Bloqueado";
  return "Pendiente";
}

function StepIcon({ status }: { status: FounderLifecycleStep["status"] }) {
  if (status === "complete") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "blocked") {
    return <span className="fhis-venture-pipeline-blocked-mark">!</span>;
  }
  return <span className="fhis-venture-pipeline-dot" />;
}

export function FounderLifecyclePipeline({ steps }: FounderLifecyclePipelineProps) {
  return (
    <div
      className="fhis-venture-pipeline fhis-vws-lifecycle"
      role="list"
      aria-label="Pipeline del ciclo de vida del fundador"
    >
      {steps.map((step) => {
        const statusText = stepStatusText(step.status);
        return (
          <div key={step.id} className="fhis-venture-pipeline-item" role="listitem">
            <div className="fhis-venture-pipeline-track">
              <span
                className={cn("fhis-venture-pipeline-circle", `fhis-venture-pipeline-${step.status}`)}
                title={`${step.label}: ${statusText}`}
              >
                <StepIcon status={step.status} />
              </span>
            </div>
            <span className={cn("fhis-venture-pipeline-label", `fhis-venture-pipeline-label-${step.status}`)}>
              {step.label}
            </span>
            <span className={cn("fhis-venture-pipeline-status", `fhis-venture-pipeline-status-${step.status}`)}>
              {statusText}
            </span>
          </div>
        );
      })}
    </div>
  );
}
