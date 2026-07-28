"use client";

import type { DeploymentOutputPayload } from "@/lib/creation-output/types";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";

interface Props {
  payload: DeploymentOutputPayload;
}

export function DeploymentPreviewView({ payload }: Props) {
  const dryRunLabel = payload.dryRun ? "DRY RUN / PREVIEW PLAN / NOT DEPLOYED" : "DEPLOYED";

  return (
    <Panel>
      <Stack gap="md">
        <div
          style={{
            padding: 16,
            borderRadius: 8,
            background: payload.dryRun ? "#fef3c7" : "#fee2e2",
            border: `2px solid ${payload.dryRun ? "#f59e0b" : "#ef4444"}`,
          }}
        >
          <strong>{dryRunLabel}</strong>
          <p style={{ margin: "8px 0 0", fontSize: "0.85rem" }}>
            Sin URLs reales. Cloud Foundation adapter — sandbox únicamente.
          </p>
        </div>

        <SectionHeader title="Estado de despliegue" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <StatusCard label="GitHub" value={payload.githubStatus} />
          <StatusCard label="Repo" value={payload.repoPlan} />
          <StatusCard label="Branch" value={payload.branch} />
          <StatusCard label="Build" value={payload.buildStatus} />
          <StatusCard label="Supabase" value={payload.supabaseSandbox} />
          <StatusCard label="Vercel" value={payload.vercelPreview} />
          <StatusCard label="Environment" value={payload.environment} />
        </div>

        <SectionHeader title="Quality Gates" />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {payload.qualityGates.map((g) => (
            <Badge key={g.label} variant={g.status === "pass" ? "accent" : g.status === "fail" ? "default" : "amber"}>
              {g.label}: {g.status}
            </Badge>
          ))}
        </div>

        <SectionHeader title="Rollback" />
        <p style={{ fontSize: "0.85rem" }}>{payload.rollbackPlan}</p>
      </Stack>
    </Panel>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 10, borderRadius: 6, border: "1px solid var(--fhis-color-border)" }}>
      <div style={{ fontSize: "0.7rem", color: "var(--fhis-color-text-muted)" }}>{label}</div>
      <div style={{ fontSize: "0.8rem", fontWeight: 500 }}>{value}</div>
    </div>
  );
}
