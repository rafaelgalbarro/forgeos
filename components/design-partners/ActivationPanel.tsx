"use client";

import { Panel } from "@/components/ui/fhis/Layout";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import type { SuccessDashboardData } from "@/lib/design-partners";

interface ActivationPanelProps {
  data: SuccessDashboardData["activation"];
}

export function ActivationPanel({ data }: ActivationPanelProps) {
  return (
    <Panel className="fhis-beta-kpi">
      <KpiBlock label="Activación" value={`${data.rate}%`} />
      <p className="fhis-beta-signup-hint">
        {data.completed} de {data.started} completaron venture
      </p>
    </Panel>
  );
}
