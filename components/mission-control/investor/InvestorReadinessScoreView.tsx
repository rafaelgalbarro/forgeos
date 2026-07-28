"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Progress } from "@/components/ui/fhis/Progress";
import { Badge } from "@/components/ui/fhis/Badge";
import type { InvestorReadinessScore } from "@/lib/mission-control/investor-mode/types";

interface Props {
  readiness: InvestorReadinessScore;
}

const BREAKDOWN_LABELS: Record<keyof InvestorReadinessScore["breakdown"], string> = {
  dataRoom: "Data Room",
  deck: "Investor Deck",
  financialModel: "Modelo Financiero",
  valuation: "Valoración",
  dueDiligence: "Due Diligence",
  faq: "FAQ Inversor",
  fundingPlan: "Plan Financiación",
  ventureIntelligence: "Venture Intelligence",
};

export function InvestorReadinessScoreView({ readiness }: Props) {
  const variant = readiness.score >= 80 ? "accent" : readiness.score >= 60 ? "amber" : "default";

  return (
    <Panel>
      <Stack gap="lg">
        <SectionHeader title="Investor Readiness Score" subtitle={readiness.disclaimer} />
        <div style={{ textAlign: "center", padding: 24 }}>
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              border: `6px solid var(--fhis-color-accent)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
              fontSize: "2.5rem",
              fontWeight: 700,
            }}
          >
            {readiness.score}%
          </div>
          <Badge variant={variant}>
            {readiness.score >= 80 ? "Listo para inversores" : readiness.score >= 60 ? "Casi listo" : "En preparación"}
          </Badge>
        </div>
        <KpiBlock label="Próximo paso" value={readiness.recommendedNextStep} />
        <div>
          <h4 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: 8 }}>Desglose</h4>
          {(Object.entries(readiness.breakdown) as [keyof typeof BREAKDOWN_LABELS, number][]).map(([key, val]) => (
            <div key={key} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                <span>{BREAKDOWN_LABELS[key]}</span>
                <span>{val}%</span>
              </div>
              <Progress value={val} max={100} />
            </div>
          ))}
        </div>
        {readiness.gaps.length > 0 && (
          <div>
            <h4 style={{ fontSize: "0.875rem", fontWeight: 600 }}>Gaps</h4>
            <ul style={{ fontSize: "0.875rem", paddingLeft: 20, color: "var(--fhis-color-text-muted)" }}>
              {readiness.gaps.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
        )}
      </Stack>
    </Panel>
  );
}
