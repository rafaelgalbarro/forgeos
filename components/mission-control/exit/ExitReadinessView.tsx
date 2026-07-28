"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Progress } from "@/components/ui/fhis/Progress";
import { getExitStrategyLabel } from "@/lib/mission-control/exit-strategy";
import type { ExitReadiness } from "@/lib/mission-control/exit-strategy";

interface Props {
  readiness: ExitReadiness;
}

export function ExitReadinessView({ readiness }: Props) {
  const scoreColor =
    readiness.score >= 70
      ? "var(--fhis-color-accent, #2563eb)"
      : readiness.score >= 40
        ? "var(--fhis-color-warning, #c27803)"
        : "var(--fhis-color-danger, #dc2626)";

  return (
    <Panel className="fhis-mc-exit-readiness">
      <Stack gap="md">
        <SectionHeader
          title="Exit Readiness"
          subtitle={`${getExitStrategyLabel(readiness.strategy)} · ${readiness.score}/100`}
        />

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "2.5rem",
              fontWeight: 700,
              color: scoreColor,
              lineHeight: 1,
            }}
          >
            {readiness.score}
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>/ 100</span>
        </div>

        <section>
          <strong style={{ fontSize: "0.85rem" }}>Desglose por dimensión</strong>
          {readiness.dimensions.map((dim) => (
            <div key={dim.id} style={{ marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
                <span>{dim.label}</span>
                <span>{dim.score}%</span>
              </div>
              <Progress value={dim.score} max={100} />
              <p style={{ margin: "2px 0 0", fontSize: "0.6875rem", color: "var(--fhis-color-text-muted)" }}>
                {dim.note}
              </p>
            </div>
          ))}
        </section>

        {readiness.gaps.length > 0 && (
          <section>
            <strong style={{ fontSize: "0.85rem" }}>Brechas detectadas</strong>
            <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: "0.8125rem" }}>
              {readiness.gaps.map((gap, i) => (
                <li key={i} style={{ color: "var(--fhis-color-text-muted)" }}>
                  {gap}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <strong style={{ fontSize: "0.85rem" }}>Próximo paso</strong>
          <p style={{ margin: "6px 0 0", fontSize: "0.8125rem", color: "var(--fhis-color-text-muted)" }}>
            {readiness.recommendedNextStep}
          </p>
        </section>
      </Stack>
    </Panel>
  );
}
