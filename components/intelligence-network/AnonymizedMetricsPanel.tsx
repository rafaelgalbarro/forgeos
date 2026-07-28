"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import { Card } from "@/components/ui/fhis/Card";
import type { AnonymizedMetric } from "@/lib/network/types";
import { DEMO_DISCLAIMER } from "@/lib/intelligence-network";

interface Props {
  metrics: AnonymizedMetric[];
}

export function AnonymizedMetricsPanel({ metrics }: Props) {
  return (
    <Card className="fhis-network-anon-metrics">
      <div className="fhis-network-panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>Métricas anonimizadas</h3>
        <Badge variant="amber">{DEMO_DISCLAIMER}</Badge>
      </div>
      <p className="fhis-network-panel-desc" style={{ margin: "0.5rem 0 1rem" }}>
        Solo buckets agregados. Sin PII ni identificadores de venture.
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {metrics.map((m) => (
          <li key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--fhis-border-subtle, #333)" }}>
            <span>{m.label}</span>
            <span>
              <strong>{m.value}</strong> {m.unit}
              <span style={{ marginLeft: "0.5rem" }}>
                <Badge variant="default">n={m.sampleSize}</Badge>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
