"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Progress } from "@/components/ui/fhis/Progress";
import { Badge } from "@/components/ui/fhis/Badge";
import type { MissionValidationScores } from "@/lib/mission-control/types";

interface Props {
  scores?: MissionValidationScores;
}

const SCORE_LABELS: Array<{ key: keyof Omit<MissionValidationScores, "source" | "generatedAt">; label: string }> = [
  { key: "venture", label: "Venture" },
  { key: "product", label: "Product" },
  { key: "technical", label: "Technical" },
  { key: "market", label: "Market" },
  { key: "risk", label: "Risk" },
  { key: "mvpReadiness", label: "MVP Readiness" },
  { key: "launchReadiness", label: "Launch Readiness" },
  { key: "investorReadiness", label: "Investor Readiness" },
];

export function ValidationScoresPanel({ scores }: Props) {
  if (!scores) return null;

  return (
    <Panel className="fhis-mc-scores-panel">
      <Stack gap="md">
        <SectionHeader
          title="Validation Scores"
          subtitle={`Fuente: ${scores.source} · ${scores.generatedAt.slice(0, 10)}`}
        />
        {SCORE_LABELS.map(({ key, label }) => (
          <div key={key}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: "0.8rem" }}>{label}</span>
              <Badge variant={scores[key] >= 70 ? "accent" : "default"}>{scores[key]}%</Badge>
            </div>
            <Progress value={scores[key]} max={100} />
          </div>
        ))}
      </Stack>
    </Panel>
  );
}
