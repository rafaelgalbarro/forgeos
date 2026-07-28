"use client";

import { Switch } from "@/components/ui/fhis/Switch";
import type { AutoPilotState } from "@/lib/mission-control/types";
import { autoPilotLabel } from "@/lib/mission-control/auto-pilot";

interface Props {
  state: AutoPilotState;
  onChange: (enabled: boolean) => void;
  autonomousStatus?: string;
}

export function AutoPilotToggle({ state, onChange, autonomousStatus }: Props) {
  const label = autoPilotLabel(state);
  const isOn = state.enabled && !state.pausedForDecision;

  return (
    <div
      className="fhis-mc-autopilot"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 16px",
        fontSize: "0.8125rem",
        borderBottom: "1px solid var(--fhis-color-border)",
        background: isOn ? "var(--fhis-color-accent-muted, rgba(99,102,241,0.08))" : undefined,
      }}
    >
      <Switch
        checked={state.enabled}
        onChange={onChange}
        label={`${isOn ? "🟢" : "⚪"} Continuar automáticamente`}
      />
      <span style={{ color: "var(--fhis-color-text-muted)", fontSize: "0.75rem" }}>
        {autonomousStatus ?? label}
      </span>
    </div>
  );
}

/** Alias — AutonomousBuildToggle (PROGRAM 5500). */
export const AutonomousBuildToggle = AutoPilotToggle;
