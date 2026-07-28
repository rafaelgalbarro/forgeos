"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import {
  EXIT_STRATEGY_ORDER,
  getExitStrategyConfig,
  getExitStrategyLabel,
} from "@/lib/mission-control/exit-strategy";
import type { ExitStrategyType } from "@/lib/mission-control/exit-strategy";

interface Props {
  selected: ExitStrategyType | null;
  onSelect: (strategy: ExitStrategyType) => void;
  impactWarning?: string;
}

export function ExitStrategyPanel({ selected, onSelect, impactWarning }: Props) {
  return (
    <Panel className="fhis-mc-exit-strategy-panel">
      <Stack gap="md">
        <SectionHeader
          title="Estrategia de salida"
          subtitle={selected ? getExitStrategyLabel(selected) : "Selecciona tu exit path"}
        />

        {impactWarning && (
          <p style={{ fontSize: "0.8125rem", color: "var(--fhis-color-warning, #c27803)", margin: 0 }}>
            ⚠️ {impactWarning}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {EXIT_STRATEGY_ORDER.map((type) => {
            const config = getExitStrategyConfig(type);
            const isSelected = selected === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onSelect(type)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  border: isSelected
                    ? "2px solid var(--fhis-color-accent, #2563eb)"
                    : "1px solid var(--fhis-color-border)",
                  borderRadius: 8,
                  background: isSelected ? "var(--fhis-color-accent-subtle, #eff6ff)" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <span style={{ fontSize: "1.25rem" }}>{config.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <strong style={{ fontSize: "0.875rem" }}>{config.labelEs}</strong>
                    {isSelected && <Badge variant="accent">Activa</Badge>}
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>
                    {config.description}
                  </p>
                  <span style={{ fontSize: "0.6875rem", color: "var(--fhis-color-text-muted)" }}>
                    Timeline: {config.timelineYears}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </Stack>
    </Panel>
  );
}
