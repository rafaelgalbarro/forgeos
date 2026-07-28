"use client";

import { Panel } from "@/components/ui/fhis/Layout";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import type { SuccessDashboardData } from "@/lib/design-partners";

interface NpsPanelProps {
  data: SuccessDashboardData["nps"];
}

export function NpsPanel({ data }: NpsPanelProps) {
  return (
    <Panel className="fhis-beta-kpi">
      <KpiBlock label="NPS" value={data.score} />
      <p className="fhis-beta-signup-hint">
        {data.responses} respuestas · {data.promoters} promotores · {data.detractors} detractores
      </p>
    </Panel>
  );
}
