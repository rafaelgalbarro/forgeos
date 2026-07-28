"use client";

import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Panel } from "@/components/ui/fhis/Layout";
import { Progress } from "@/components/ui/fhis/Progress";
import type { HealthScoreBreakdown } from "@/lib/self-evolution";

interface Props {
  score: HealthScoreBreakdown;
}

const DIMENSIONS: Array<{ key: keyof Omit<HealthScoreBreakdown, "overall">; label: string }> = [
  { key: "codeHealth", label: "Código" },
  { key: "performance", label: "Rendimiento" },
  { key: "ux", label: "UX" },
  { key: "security", label: "Seguridad" },
  { key: "documentation", label: "Docs" },
  { key: "architecture", label: "Arquitectura" },
];

export function HealthScorePanel({ score }: Props) {
  return (
    <Panel className="fhis-sevo-panel">
      <h3 className="fhis-sevo-panel-title">Health Score</h3>
      <div className="fhis-sevo-health-hero">
        <KpiBlock label="Score global" value={String(score.overall)} delta={score.overall - 70} />
      </div>
      <ul className="fhis-sevo-score-list">
        {DIMENSIONS.map(({ key, label }) => (
          <li key={key}>
            <span>{label}</span>
            <Progress value={score[key]} max={100} />
            <span className="fhis-sevo-score-val">{score[key]}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
