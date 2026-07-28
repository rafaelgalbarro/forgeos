"use client";

import { buildUsageMetrics, getUsagePercent } from "@/lib/enterprise/usage-engine";
import { Panel } from "@/components/ui/fhis/Layout";
import { Progress } from "@/components/ui/fhis/Progress";
import type { EnterpriseOrganization } from "@/lib/enterprise/types";

interface UsageMeterProps {
  org?: EnterpriseOrganization;
}

export function UsageMeter({ org }: UsageMeterProps) {
  const metrics = org ? buildUsageMetrics(org.id) : [];

  return (
    <Panel className="fhis-enterprise-step">
      <h3>5. Uso y límites</h3>
      <p className="fhis-enterprise-muted">Período: {new Date().toISOString().slice(0, 7)}</p>
      {!org ? (
        <p className="fhis-enterprise-muted">Crea una organización primero</p>
      ) : (
        <div className="fhis-enterprise-usage-grid">
          {metrics.map((m) => {
            const pct = getUsagePercent(m);
            return (
              <div key={m.id} className="fhis-enterprise-usage-item">
                <div className="fhis-enterprise-step-head">
                  <span>{m.label}</span>
                  <span className="fhis-enterprise-muted">
                    {m.used.toLocaleString("es")} / {m.limit.toLocaleString("es")} {m.unit}
                  </span>
                </div>
                <Progress value={pct} />
                <span className="fhis-enterprise-muted">{pct}% utilizado</span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
