"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Progress } from "@/components/ui/fhis/Progress";
import { getExitStrategyLabel } from "@/lib/mission-control/exit-strategy";
import type { StrategicAlignment } from "@/lib/mission-control/exit-strategy";

interface Props {
  alignment: StrategicAlignment;
}

const SEVERITY_VARIANT: Record<"low" | "medium" | "high", "default" | "amber" | "red"> = {
  low: "default",
  medium: "amber",
  high: "red",
};

export function StrategicAlignmentView({ alignment }: Props) {
  return (
    <Panel className="fhis-mc-strategic-alignment">
      <Stack gap="md">
        <SectionHeader
          title="Alineación estratégica"
          subtitle={`${getExitStrategyLabel(alignment.strategy)} · ${alignment.score}/100`}
        />

        <Progress value={alignment.score} max={100} />

        {alignment.alignedAreas.length > 0 && (
          <section>
            <strong style={{ fontSize: "0.85rem" }}>Áreas alineadas</strong>
            <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: "0.8125rem" }}>
              {alignment.alignedAreas.map((area, i) => (
                <li key={i} style={{ color: "var(--fhis-color-accent, #2563eb)" }}>
                  ✓ {area}
                </li>
              ))}
            </ul>
          </section>
        )}

        {alignment.misalignedAreas.length > 0 && (
          <section>
            <strong style={{ fontSize: "0.85rem" }}>Áreas desalineadas</strong>
            <ul style={{ margin: "6px 0 0", paddingLeft: 0, listStyle: "none" }}>
              {alignment.misalignedAreas.map((area) => (
                <li key={area.domain} style={{ marginBottom: 8 }}>
                  <Badge variant={SEVERITY_VARIANT[area.severity]}>{area.severity}</Badge>
                  <span style={{ fontSize: "0.8125rem", marginLeft: 6 }}>{area.label}</span>
                  <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>
                    Actual: {area.currentState} → Esperado: {area.expectedState}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </Stack>
    </Panel>
  );
}
