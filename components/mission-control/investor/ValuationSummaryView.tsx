"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Badge } from "@/components/ui/fhis/Badge";
import type { ValuationSummary } from "@/lib/mission-control/investor-mode/types";

interface Props {
  valuation: ValuationSummary;
}

function formatEur(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M€`;
  return `${(n / 1_000).toFixed(0)}K €`;
}

export function ValuationSummaryView({ valuation }: Props) {
  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader title="Valoración" subtitle={valuation.methodology} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <KpiBlock label="Valoración central" value={formatEur(valuation.amountEur)} />
          <KpiBlock label="Rango bajo" value={formatEur(valuation.rangeLowEur)} />
          <KpiBlock label="Rango alto" value={formatEur(valuation.rangeHighEur)} />
        </div>
        <div>
          <h4 style={{ fontSize: "0.875rem", fontWeight: 600 }}>Factores</h4>
          <ul style={{ fontSize: "0.875rem", paddingLeft: 20 }}>
            {valuation.factors.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
        <Badge variant="amber">{valuation.disclaimer}</Badge>
      </Stack>
    </Panel>
  );
}
