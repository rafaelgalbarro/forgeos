"use client";

import type { AppProject } from "@/lib/application-factory";
import { syncBuildStatusFromProject, statusLabelEs } from "@/lib/application-factory";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Progress } from "@/components/ui/fhis/Progress";

interface Props {
  project: AppProject;
}

export function ApplicationBuildStatus({ project }: Props) {
  const status = syncBuildStatusFromProject(project);

  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader
          title="Estado del build"
          subtitle={`${status.overallPercent}% completado`}
        />
        <Progress value={status.overallPercent} />
        <Stack gap="sm">
          {status.entries.map((entry) => (
            <div
              key={entry.phase}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid var(--fhis-color-border)",
                fontSize: 13,
              }}
            >
              <span>{entry.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--fhis-color-text-muted)", fontSize: 12 }}>
                  {entry.message}
                </span>
                <Badge
                  variant={
                    entry.status === "success"
                      ? "accent"
                      : entry.status === "stub"
                        ? "amber"
                        : entry.status === "running"
                          ? "amber"
                          : "default"
                  }
                >
                  {statusLabelEs(entry.status)}
                </Badge>
              </div>
            </div>
          ))}
        </Stack>
        {status.githubRepo && (
          <p style={{ margin: 0, fontSize: 12, color: "var(--fhis-color-text-muted)" }}>
            GitHub: {status.githubRepo} · Supabase: {status.supabaseProject ?? "—"} · Deploy:{" "}
            {status.deployUrl ?? "—"}
          </p>
        )}
      </Stack>
    </Panel>
  );
}
