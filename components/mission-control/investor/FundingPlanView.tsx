"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Badge } from "@/components/ui/fhis/Badge";
import { Progress } from "@/components/ui/fhis/Progress";
import type { FundingPlan } from "@/lib/mission-control/investor-mode/types";

interface Props {
  plan: FundingPlan;
}

export function FundingPlanView({ plan }: Props) {
  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader title="Plan de Financiación" subtitle={`Ronda ${plan.targetRound} · ${plan.disclaimer}`} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          <KpiBlock label="Tamaño ronda" value={`${(plan.roundSizeEur / 1_000).toFixed(0)}K €`} />
          <KpiBlock label="Timeline" value={`${plan.timelineMonths} meses`} />
        </div>
        <div>
          <h4 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: 8 }}>Uso de fondos</h4>
          {plan.useOfFunds.map((u) => (
            <div key={u.label} style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                <span>{u.label}</span>
                <span>{u.pct}%</span>
              </div>
              <Progress value={u.pct} max={100} />
            </div>
          ))}
        </div>
        <div>
          <h4 style={{ fontSize: "0.875rem", fontWeight: 600 }}>Inversores target</h4>
          <ul style={{ fontSize: "0.875rem", paddingLeft: 20 }}>
            {plan.targetInvestors.map((inv) => (
              <li key={inv}>{inv}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 style={{ fontSize: "0.875rem", fontWeight: 600 }}>Milestones</h4>
          <ol style={{ fontSize: "0.875rem", paddingLeft: 20 }}>
            {plan.milestones.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ol>
        </div>
        <Badge variant="amber">{plan.disclaimer}</Badge>
      </Stack>
    </Panel>
  );
}
