"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import { getFeatureAdoptionMetrics } from "@/lib/customer-success";
import type { FeatureAdoptionMetric } from "@/lib/customer-success";

const TREND_LABELS: Record<FeatureAdoptionMetric["trend"], string> = {
  up: "↑ Subiendo",
  down: "↓ Bajo",
  stable: "→ Estable",
};

export function FeatureAdoptionPanel() {
  const [metrics, setMetrics] = useState<FeatureAdoptionMetric[]>([]);

  useEffect(() => {
    setMetrics(getFeatureAdoptionMetrics());
  }, []);

  return (
    <Panel>
      <h3 className="fhis-beta-panel-title">Adopción de funciones</h3>
      {metrics.length === 0 ? (
        <p className="fhis-beta-empty">Sin eventos de adopción registrados.</p>
      ) : (
        metrics.map((m) => (
          <div key={m.feature} className="fhis-beta-analytics-row">
            <span>
              {m.feature}{" "}
              <Badge variant="accent">{TREND_LABELS[m.trend]}</Badge>
            </span>
            <span>
              {m.adopters}/{m.totalUsers} ({m.adoptionRate}%)
            </span>
          </div>
        ))
      )}
    </Panel>
  );
}
