"use client";

import { Panel } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import type { ObservationSignal } from "@/lib/self-evolution";

interface Props {
  observations: ObservationSignal[];
}

function severityVariant(s: ObservationSignal["severity"]) {
  if (s === "critical") return "red" as const;
  if (s === "warning") return "amber" as const;
  return "default" as const;
}

export function ObservationFeedPanel({ observations }: Props) {
  return (
    <Panel className="fhis-sevo-panel">
      <div className="fhis-sevo-panel-header">
        <h3 className="fhis-sevo-panel-title">Feed de observaciones</h3>
        <Badge variant="accent">{observations.length}</Badge>
      </div>
      <ul className="fhis-sevo-obs-list">
        {observations.map((obs) => (
          <li key={obs.id} className="fhis-sevo-obs-item">
            <div className="fhis-sevo-obs-head">
              <Badge variant={severityVariant(obs.severity)}>{obs.severity}</Badge>
              <Badge variant="default">{obs.category}</Badge>
              <span className="fhis-sevo-obs-time">
                {new Date(obs.detectedAt).toLocaleTimeString("es-ES")}
              </span>
            </div>
            <strong>{obs.title}</strong>
            <p>{obs.description}</p>
            {obs.metric && (
              <span className="fhis-sevo-obs-metric">
                {obs.metric}: {obs.value}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
