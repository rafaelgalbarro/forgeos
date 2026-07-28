"use client";

import { Panel } from "@/components/ui/fhis/Layout";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import type { ProposalRisk } from "@/lib/self-evolution";

interface Props {
  aggregateRoi: number;
  aggregateRisk: ProposalRisk;
  proposalCount: number;
}

export function RoiRiskPanel({ aggregateRoi, aggregateRisk, proposalCount }: Props) {
  return (
    <Panel className="fhis-sevo-panel fhis-sevo-roi-risk">
      <h3 className="fhis-sevo-panel-title">ROI & Riesgo</h3>
      <div className="fhis-sevo-kpi-row">
        <KpiBlock label="ROI agregado" value={String(aggregateRoi)} delta={12} />
        <KpiBlock label="Riesgo agregado" value={aggregateRisk} />
        <KpiBlock label="Propuestas activas" value={String(proposalCount)} />
      </div>
      <p className="fhis-sevo-hint">
        Estimaciones heurísticas — requieren validación humana antes de ejecución.
      </p>
    </Panel>
  );
}
