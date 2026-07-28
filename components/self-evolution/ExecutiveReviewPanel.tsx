"use client";

import { Panel } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import { Status } from "@/components/ui/fhis/Status";
import type { ExecutiveReviewSimulation } from "@/lib/self-evolution";

interface Props {
  reviews: ExecutiveReviewSimulation[];
}

function stageStatus(s: ExecutiveReviewSimulation["steps"][0]["status"]) {
  if (s === "approved") return "success" as const;
  if (s === "rejected") return "error" as const;
  if (s === "in-review") return "warning" as const;
  return "pending" as const;
}

export function ExecutiveReviewPanel({ reviews }: Props) {
  const primary = reviews[0];
  if (!primary) return null;

  return (
    <Panel className="fhis-sevo-panel">
      <div className="fhis-sevo-panel-header">
        <h3 className="fhis-sevo-panel-title">Revisión ejecutiva (simulación)</h3>
        <Badge variant="amber">DRY-RUN</Badge>
      </div>
      <p className="fhis-sevo-hint">
        Flujo: CEO → Board → Department Owners → Risk Review → Approval
      </p>
      <ol className="fhis-sevo-exec-steps">
        {primary.steps.map((step) => (
          <li key={step.stage} className="fhis-sevo-exec-step">
            <Status status={stageStatus(step.status)} label={step.label} />
            <span className="fhis-sevo-exec-reviewer">{step.reviewer}</span>
            {step.notes && <span className="fhis-sevo-exec-notes">{step.notes}</span>}
          </li>
        ))}
      </ol>
      <p className="fhis-sevo-exec-status">
        Estado: <strong>{primary.overallStatus}</strong> — etapa actual:{" "}
        <strong>{primary.currentStage}</strong>
      </p>
    </Panel>
  );
}
