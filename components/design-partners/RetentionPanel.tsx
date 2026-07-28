"use client";

import { Panel } from "@/components/ui/fhis/Layout";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import type { SuccessDashboardData } from "@/lib/design-partners";

interface RetentionPanelProps {
  data: SuccessDashboardData["retention"];
}

export function RetentionPanel({ data }: RetentionPanelProps) {
  return (
    <Panel className="fhis-beta-kpi">
      <KpiBlock label="Retención" value={`${data.rate}%`} />
      <p className="fhis-beta-signup-hint">
        {data.returningUsers} usuarios recurrentes de cohorte {data.cohortSize}
      </p>
    </Panel>
  );
}
