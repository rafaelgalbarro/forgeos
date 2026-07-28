"use client";

import Link from "next/link";
import { Badge, Grid, KpiBlock, Panel, SectionHeader } from "@/components/ui/fhis";
import { statusLabelEs, syncBuildStatusFromProject } from "@/lib/website-factory";
import type { BuildPhaseStatus, WebsiteProject } from "@/lib/website-factory";

interface WebsiteBuildStatusProps {
  project: WebsiteProject;
}

function statusVariant(status: BuildPhaseStatus): "default" | "accent" | "amber" | "red" {
  switch (status) {
    case "success":
      return "accent";
    case "running":
      return "amber";
    case "error":
      return "red";
    case "stub":
      return "amber";
    default:
      return "default";
  }
}

export function WebsiteBuildStatus({ project }: WebsiteBuildStatusProps) {
  const status = syncBuildStatusFromProject(project);

  return (
    <Panel className="fhis-wf-build-status">
      <SectionHeader title="Estado de build" subtitle={`${status.overallPercent}% completado`} />
      <Grid cols={3} gap="md" style={{ marginBottom: 16 }}>
        <KpiBlock label="Fases OK" value={`${status.entries.filter((e) => e.status === "success" || e.status === "stub").length}/${status.entries.length}`} />
        <KpiBlock label="GitHub" value={status.githubRepo ? "Stub" : "—"} />
        <KpiBlock label="Deploy" value={status.deployUrl ? "Stub" : "—"} />
      </Grid>
      <Grid cols={2} gap="sm">
        {status.entries.map((entry) => (
          <div
            key={entry.phase}
            style={{
              padding: "var(--fhis-space-3)",
              border: "1px solid var(--fhis-color-line)",
              borderRadius: 8,
              background: "var(--fhis-color-panel)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <strong style={{ fontSize: 14 }}>{entry.label}</strong>
              <Badge variant={statusVariant(entry.status)}>{statusLabelEs(entry.status)}</Badge>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--fhis-color-text-muted)" }}>{entry.message}</p>
          </div>
        ))}
      </Grid>
      {(status.githubRepo || status.deployUrl) && (
        <div style={{ marginTop: 16, fontSize: 13 }}>
          {status.githubRepo && <p style={{ margin: "4px 0" }}>Repo: <code>{status.githubRepo}</code></p>}
          {status.deployUrl && (
            <p style={{ margin: "4px 0" }}>
              Preview:{" "}
              <Link href="/cloud" style={{ color: "var(--fhis-color-accent)" }}>
                Cloud Foundation
              </Link>{" "}
              — <code>{status.deployUrl}</code> (stub)
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}
