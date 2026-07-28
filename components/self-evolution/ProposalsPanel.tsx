"use client";

import { Panel } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import type { ImprovementProposal } from "@/lib/self-evolution";

interface Props {
  proposals: ImprovementProposal[];
  title: string;
  emptyLabel?: string;
}

function riskVariant(risk: ImprovementProposal["risk"]) {
  if (risk === "high") return "red" as const;
  if (risk === "medium") return "amber" as const;
  return "default" as const;
}

export function ProposalsPanel({ proposals, title, emptyLabel = "Ninguna" }: Props) {
  return (
    <Panel className="fhis-sevo-panel">
      <div className="fhis-sevo-panel-header">
        <h3 className="fhis-sevo-panel-title">{title}</h3>
        <Badge variant="accent">{proposals.length}</Badge>
      </div>
      {proposals.length === 0 ? (
        <p className="fhis-sevo-empty">{emptyLabel}</p>
      ) : (
        <ul className="fhis-sevo-proposal-list">
          {proposals.map((p) => (
            <li key={p.id} className="fhis-sevo-proposal-item">
              <div className="fhis-sevo-proposal-head">
                <strong>{p.title}</strong>
                <Badge variant={riskVariant(p.risk)}>{p.risk}</Badge>
              </div>
              <p>{p.description}</p>
              <div className="fhis-sevo-proposal-meta">
                <span>ROI {p.roiScore}</span>
                <span>·</span>
                <span>{p.estimatedTimeHours}h</span>
                <span>·</span>
                <span>{p.affectedArea}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
