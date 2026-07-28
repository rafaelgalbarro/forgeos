"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/fhis/Layout";
import { getConversionFunnels, getPrimaryFunnel } from "@/lib/customer-success";

export function FunnelsPanel() {
  const [funnels, setFunnels] = useState(getPrimaryFunnel());

  useEffect(() => {
    setFunnels(getPrimaryFunnel());
  }, []);

  const allFunnels = getConversionFunnels();

  return (
    <Panel>
      <h3 className="fhis-beta-panel-title">Embudos de conversión</h3>
      <p className="fhis-beta-signup-hint">Embudo principal (landing → analytics)</p>
      {funnels.map((step) => (
        <div key={step.id} className="fhis-beta-analytics-row">
          <span>{step.label}</span>
          <span>
            {step.count} usuarios · {step.conversionRate}% conv.
          </span>
        </div>
      ))}

      <details className="fhis-beta-signup-hint" style={{ marginTop: "1rem" }}>
        <summary>Ver embudo completo ({allFunnels.length} etapas)</summary>
        {allFunnels.map((step) => (
          <div key={step.id} className="fhis-beta-analytics-row">
            <span>{step.label}</span>
            <span>{step.count}</span>
          </div>
        ))}
      </details>
    </Panel>
  );
}
