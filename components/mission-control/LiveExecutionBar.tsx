"use client";

import type { LiveExecutionStatus } from "@/lib/mission-control/types";
import { executionProgressPercent } from "@/lib/mission-control/live-execution";

interface Props {
  status: LiveExecutionStatus;
}

export function LiveExecutionBar({ status }: Props) {
  if (!status.steps.length) return null;

  const pct = executionProgressPercent(status);

  return (
    <div
      className="fhis-mc-live-bar"
      style={{
        padding: "8px 16px",
        background: "var(--fhis-color-surface)",
        borderBottom: "1px solid var(--fhis-color-border)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
        {status.active ? "🟢 Agentes trabajando" : "✅ Ejecución completada"}
      </span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
        {status.steps.map((step) => (
          <span
            key={step.id}
            style={{
              fontSize: "0.75rem",
              padding: "2px 8px",
              borderRadius: 4,
              background:
                step.status === "completed"
                  ? "var(--fhis-color-success-bg, #ecfdf5)"
                  : step.status === "working"
                    ? "var(--fhis-color-accent-bg, #eff6ff)"
                    : "var(--fhis-color-muted-bg, #f3f4f6)",
            }}
          >
            {step.status === "completed" ? "✅" : step.status === "working" ? "🟢" : "⏳"} {step.label}
          </span>
        ))}
      </div>
      <span style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>{pct}%</span>
    </div>
  );
}
