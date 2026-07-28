"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import { impactLabelEs, impactVariant } from "@/lib/mission-control/exit-strategy";
import type { DecisionImpact } from "@/lib/mission-control/exit-strategy";

interface Props {
  impacts: DecisionImpact[];
}

export function DecisionImpactList({ impacts }: Props) {
  if (!impacts.length) return null;

  return (
    <div className="fhis-mc-decision-impact-list" style={{ marginTop: 8 }}>
      {impacts.map((impact) => (
        <div
          key={impact.decisionId}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            marginBottom: 6,
            fontSize: "0.75rem",
          }}
        >
          <Badge variant={impactVariant(impact.impact)}>{impactLabelEs(impact.impact)}</Badge>
          <div>
            <strong>{impact.decisionTitle}</strong>
            <p style={{ margin: "2px 0 0", color: "var(--fhis-color-text-muted)" }}>{impact.explanation}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

interface SingleImpactProps {
  impact: DecisionImpact;
}

export function DecisionImpactBadge({ impact }: SingleImpactProps) {
  return (
    <span title={impact.explanation}>
      <Badge variant={impactVariant(impact.impact)}>
        Impacto: {impactLabelEs(impact.impact)}
      </Badge>
    </span>
  );
}
