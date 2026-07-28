"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import type { ObservabilityEntry } from "./types";
import { MetricRow, SectionTitle, formatCost, formatMs, formatPct } from "./shared";

interface Props {
  entries: ObservabilityEntry[];
}

export function ObservabilityPanel({ entries }: Props) {
  return (
    <Panel>
      <SectionTitle>Observability (sesión)</SectionTitle>
      {entries.length === 0 ? (
        <p style={{ opacity: 0.7, margin: 0 }}>Sin registros — ejecuta el runtime para observar.</p>
      ) : (
        <Stack gap="md">
          {entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                padding: "var(--fhis-space-3)",
                border: "1px solid var(--fhis-color-border, #333)",
                borderRadius: "var(--fhis-radius-sm, 4px)",
                fontSize: "0.8125rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--fhis-space-2)" }}>
                <strong>{entry.task}</strong>
                <span style={{ opacity: 0.6, fontSize: "0.75rem" }}>
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <Stack gap="sm">
                <MetricRow label="Provider" value={entry.provider} />
                <MetricRow label="Runtime" value={entry.runtime} />
                <MetricRow label="Session" value={entry.sessionId ?? "—"} />
                <MetricRow label="Decision" value={entry.decisionId ?? "—"} />
                <MetricRow label="Latency" value={formatMs(entry.latencyMs)} />
                <MetricRow label="Cost" value={formatCost(entry.costEstimate)} />
                <MetricRow
                  label="Confidence"
                  value={entry.confidence != null ? formatPct(entry.confidence) : "—"}
                />
                {entry.errors.length > 0 && (
                  <MetricRow
                    label="Errors"
                    value={
                      <Badge variant="default">{entry.errors.length}</Badge>
                    }
                  />
                )}
                {entry.warnings.length > 0 && (
                  <div>
                    <span style={{ opacity: 0.6 }}>Warnings ({entry.warnings.length})</span>
                    <ul style={{ margin: "4px 0 0", paddingLeft: "1.25rem" }}>
                      {entry.warnings.slice(0, 3).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Stack>
            </div>
          ))}
        </Stack>
      )}
    </Panel>
  );
}
