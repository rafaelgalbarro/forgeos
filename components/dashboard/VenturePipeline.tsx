import type { PipelineStep } from "@/lib/portfolio";
import { cn } from "@/lib/design-system/cn";

interface VenturePipelineProps {
  steps: PipelineStep[];
}

function stepStatusText(status: PipelineStep["status"]): string {
  if (status === "complete") return "Completado";
  if (status === "active") return "Trabajando";
  if (status === "blocked") return "Bloqueado";
  return "Pendiente";
}

function stepTooltip(step: PipelineStep): string {
  return `${step.label}: ${stepStatusText(step.status)}`;
}

function StepIcon({ status }: { status: PipelineStep["status"] }) {
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

export function VenturePipeline({ steps }: VenturePipelineProps) {
  return (
    <div className="fhis-venture-pipeline" role="list" aria-label="Pipeline del venture">
      {steps.map((step) => {
        const statusText = stepStatusText(step.status);
        return (
          <div key={step.id} className="fhis-venture-pipeline-item" role="listitem">
            <div className="fhis-venture-pipeline-track">
              <span
                className={cn("fhis-venture-pipeline-circle", `fhis-venture-pipeline-${step.status}`)}
                title={stepTooltip(step)}
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
