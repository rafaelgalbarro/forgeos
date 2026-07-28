"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { Card } from "@/components/ui/fhis/Card";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { Status } from "@/components/ui/fhis/Status";
import {
  RELEASE_STATUS_LABELS,
  formatSemanticVersion,
  type ReleasePackage,
} from "@/lib/build-platform/release-manager";
import { generateReleaseManagerLabPackage } from "@/lib/lab/release-manager-lab";

export function ReleaseManagerLab() {
  const [pkg, setPkg] = useState<ReleasePackage | null>(null);

  const passedGates = useMemo(
    () => pkg?.qualityGates.filter((g) => g.status === "pass").length ?? 0,
    [pkg],
  );

  return (
    <Container style={{ paddingBlock: "var(--fhis-space-6)" }}>
      <Stack gap="lg">
        <header>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--fhis-space-2)",
              marginBottom: "var(--fhis-space-2)",
            }}
          >
            <Badge variant="accent">Epic 6.8</Badge>
            <Badge variant="default">Release Manager</Badge>
            <Badge variant="default">RC1 Capstone</Badge>
          </div>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Release Manager Lab</h1>
          <p style={{ opacity: 0.8 }}>
            Convierte salidas de Build Context, DNA, Registry y todas las factories en un release package listo para revisión.
          </p>
        </header>

        <Panel>
          <Stack gap="sm">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--fhis-space-2)",
                flexWrap: "wrap",
              }}
            >
              <Button onClick={() => setPkg(generateReleaseManagerLabPackage())}>
                Generar Release Package
              </Button>
              <Status
                status={
                  pkg?.status === "READY_FOR_REVIEW"
                    ? "success"
                    : pkg?.status === "BLOCKED"
                      ? "error"
                      : pkg
                        ? "warning"
                        : "pending"
                }
                label={pkg ? RELEASE_STATUS_LABELS[pkg.status] : "Waiting"}
              />
            </div>
            {pkg ? (
              <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                Release <code>{pkg.releaseId}</code> · v{formatSemanticVersion(pkg.version)} ·{" "}
                {new Date(pkg.createdAt).toLocaleTimeString()}
              </div>
            ) : null}
          </Stack>
        </Panel>

        {pkg ? (
          <>
            <Grid cols={4} gap="md">
              <Card>
                <Metric label="Version" value={formatSemanticVersion(pkg.version)} />
              </Card>
              <Card>
                <Metric label="Status" value={RELEASE_STATUS_LABELS[pkg.status]} />
              </Card>
              <Card>
                <Metric label="Quality Gates" value={`${passedGates}/${pkg.qualityGates.length}`} />
              </Card>
              <Card>
                <Metric label="Artifacts" value={String(pkg.artifacts.refs.length)} />
              </Card>
            </Grid>

            <Panel>
              <ListPanel
                title="Release Package"
                items={[
                  `Release ID: ${pkg.releaseId}`,
                  `Venture ID: ${pkg.ventureId}`,
                  `Created: ${new Date(pkg.createdAt).toLocaleString()}`,
                  `Deployment checklist: ${pkg.deploymentChecklist.length} items`,
                ]}
              />
            </Panel>

            <Grid cols={2} gap="md">
              <Panel>
                <ListPanel
                  title="Artifacts"
                  items={pkg.artifacts.refs.map(
                    (ref) => `${ref.label} [${ref.status}]: ${ref.summary}`,
                  )}
                />
              </Panel>
              <Panel>
                <ListPanel
                  title="Quality Gates"
                  items={pkg.qualityGates.map(
                    (gate) =>
                      `${gate.status.toUpperCase()} — ${gate.label}: ${gate.message}${gate.blocking ? " (blocking)" : ""}`,
                  )}
                />
              </Panel>
            </Grid>

            <Grid cols={2} gap="md">
              <Panel>
                <ListPanel
                  title="Approval Workflow"
                  items={[
                    `Status: ${RELEASE_STATUS_LABELS[pkg.approvals.status]}`,
                    ...pkg.approvals.steps.map(
                      (step) => `${step.role}: ${step.status}`,
                    ),
                    ...(pkg.approvals.blockers.length
                      ? [`Blockers: ${pkg.approvals.blockers.join(", ")}`]
                      : []),
                  ]}
                />
              </Panel>
              <Panel>
                <ListPanel
                  title="Rollback Plan"
                  items={[
                    `Strategy: ${pkg.rollbackPlan.strategy}`,
                    `Risk level: ${pkg.rollbackPlan.riskLevel}`,
                    `Owner: ${pkg.rollbackPlan.owner}`,
                    `Affected: ${pkg.rollbackPlan.affectedSystems.join(", ")}`,
                    ...pkg.rollbackPlan.backups.map((b) => `Backup: ${b}`),
                    ...pkg.rollbackPlan.steps.map(
                      (s) => `${s.order}. ${s.action} (${s.owner}, ~${s.estimatedMinutes}m)`,
                    ),
                  ]}
                />
              </Panel>
            </Grid>

            <Grid cols={2} gap="md">
              <Panel>
                <ListPanel
                  title="Release Notes"
                  items={[
                    pkg.releaseNotes.summary,
                    ...pkg.releaseNotes.changes.map((c) => `Change: ${c}`),
                    ...pkg.releaseNotes.risks.map((r) => `Risk: ${r}`),
                    ...pkg.releaseNotes.knownIssues.map((k) => `Known: ${k}`),
                    ...pkg.releaseNotes.nextSteps.map((n) => `Next: ${n}`),
                  ]}
                />
              </Panel>
              <Panel>
                <ListPanel
                  title="Deployment Checklist"
                  items={pkg.deploymentChecklist.map(
                    (item) =>
                      `[${item.category}] ${item.label} — ${item.completed ? "done" : "pending"} (${item.owner})`,
                  )}
                />
              </Panel>
            </Grid>

            <Panel>
              <ListPanel
                title="Timeline"
                items={pkg.timeline.map(
                  (event) =>
                    `${event.phase.toUpperCase()} — ${event.label}: ${event.detail}`,
                )}
              />
            </Panel>
          </>
        ) : null}
      </Stack>
    </Container>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap="sm">
      <span style={{ opacity: 0.75, fontSize: "0.8rem" }}>{label}</span>
      <strong style={{ fontSize: "1.2rem" }}>{value}</strong>
    </Stack>
  );
}

function ListPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <Stack gap="sm">
      <p style={{ margin: 0, fontWeight: 600 }}>{title}</p>
      <div style={{ display: "grid", gap: "var(--fhis-space-1)", fontSize: "0.85rem" }}>
        {items.map((item) => (
          <div key={`${title}-${item}`}>{item}</div>
        ))}
      </div>
    </Stack>
  );
}
