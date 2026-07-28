"use client";

import type { BackendOutputPayload } from "@/lib/creation-output/types";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";

interface Props {
  payload: BackendOutputPayload;
}

export function BackendTechView({ payload }: Props) {
  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader title="Backend — Vista técnica ligera" subtitle="Sin motor DB en cliente" />
        <Badge variant="default">dry-run / preview</Badge>

        <SectionHeader title="Entidades" />
        <div style={{ display: "grid", gap: 8 }}>
          {payload.entities.map((e) => (
            <div key={e.name} style={{ padding: 10, borderRadius: 6, border: "1px solid var(--fhis-color-border)" }}>
              <strong>{e.name}</strong>
              <div style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>
                {e.fields.join(", ")}
              </div>
            </div>
          ))}
        </div>

        <SectionHeader title="API Endpoints" />
        <table style={{ width: "100%", fontSize: "0.8rem", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 6 }}>Method</th>
              <th style={{ textAlign: "left", padding: 6 }}>Path</th>
              <th style={{ textAlign: "left", padding: 6 }}>Auth</th>
            </tr>
          </thead>
          <tbody>
            {payload.apiEndpoints.slice(0, 12).map((ep, i) => (
              <tr key={i} style={{ borderTop: "1px solid var(--fhis-color-border)" }}>
                <td style={{ padding: 6 }}><Badge variant="accent">{ep.method}</Badge></td>
                <td style={{ padding: 6 }}>{ep.path}</td>
                <td style={{ padding: 6 }}>{ep.auth ? "✓" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <SectionHeader title="Env Plan" />
        <pre style={{ fontSize: "0.7rem", background: "#f5f5f5", padding: 12, borderRadius: 6, overflow: "auto" }}>
          {payload.envPlan.join("\n")}
        </pre>
      </Stack>
    </Panel>
  );
}
