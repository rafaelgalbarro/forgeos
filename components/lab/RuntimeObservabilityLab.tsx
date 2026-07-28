"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { Card } from "@/components/ui/fhis/Card";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Status } from "@/components/ui/fhis/Status";
import { Timeline } from "@/components/ui/fhis/Timeline";
import type { FhisStatus } from "@/lib/design-system/types";
import {
  createRuntimeObservabilityLab,
  runObservabilityDemo,
  type RuntimeObservabilityLabSession,
} from "@/lib/lab/runtime-observability-lab";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";
import {
  ALERT_TYPE_LABELS,
  COMPONENT_LABELS,
  HEALTH_LEVEL_LABELS,
  RECOVERY_ACTION_LABELS,
  TRACE_STAGE_LABELS,
  type RuntimeDashboardSnapshot,
  type RuntimeHealthLevel,
  type RuntimeComponentId,
} from "@/lib/runtime/observability/types";
import { EXECUTION_ENGINE_DEPENDENCY_NOTE } from "@/lib/runtime/observability/runtime-health";
import { HEALTH_LEVEL_LABELS as WORKER_HEALTH_LABELS } from "@/lib/runtime/workers/health";
import { WORKER_STATUS_LABELS } from "@/lib/runtime/workers/worker-status";

function healthToFhis(level: RuntimeHealthLevel): FhisStatus {
  switch (level) {
    case "HEALTHY":
      return "success";
    case "WARNING":
      return "warning";
    case "DEGRADED":
    case "CRITICAL":
      return "error";
    default:
      return "idle";
  }
}

function healthBadgeVariant(level: RuntimeHealthLevel): "blue" | "amber" | "red" | "default" {
  switch (level) {
    case "HEALTHY":
      return "blue";
    case "WARNING":
    case "DEGRADED":
      return "amber";
    case "CRITICAL":
      return "red";
    default:
      return "default";
  }
}

function alertLevelVariant(level: string): "blue" | "amber" | "red" | "default" {
  switch (level) {
    case "INFO":
      return "blue";
    case "WARNING":
      return "amber";
    case "ERROR":
    case "CRITICAL":
      return "red";
    default:
      return "default";
  }
}

function formatUptime(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  if (hr > 0) return `${hr}h ${min % 60}m`;
  if (min > 0) return `${min}m ${sec % 60}s`;
  return `${sec}s`;
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: "0 0 var(--fhis-space-2)", fontWeight: 600 }}>{children}</p>
  );
}

function ComponentHealthGrid({ dashboard }: { dashboard: RuntimeDashboardSnapshot }) {
  return (
    <Grid cols={3} gap="md">
      {dashboard.components.map((c) => (
        <Card key={c.component}>
          <Stack gap="sm">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>{COMPONENT_LABELS[c.component]}</strong>
              <Badge variant={healthBadgeVariant(c.level)}>
                {HEALTH_LEVEL_LABELS[c.level]}
              </Badge>
            </div>
            <p style={{ fontSize: "0.85rem", opacity: 0.85, margin: 0 }}>{c.message}</p>
          </Stack>
        </Card>
      ))}
    </Grid>
  );
}

function WorkersTable({ dashboard }: { dashboard: RuntimeDashboardSnapshot }) {
  if (dashboard.workers.length === 0) {
    return <p style={{ opacity: 0.7, margin: 0 }}>No workers registered.</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--fhis-border-subtle)" }}>
            <th style={{ textAlign: "left", padding: "var(--fhis-space-2)" }}>Worker</th>
            <th style={{ textAlign: "left", padding: "var(--fhis-space-2)" }}>Status</th>
            <th style={{ textAlign: "left", padding: "var(--fhis-space-2)" }}>Health</th>
            <th style={{ textAlign: "right", padding: "var(--fhis-space-2)" }}>Avg ms</th>
          </tr>
        </thead>
        <tbody>
          {dashboard.workers.slice(0, 12).map((w) => (
            <tr key={w.id} style={{ borderBottom: "1px solid var(--fhis-border-subtle)" }}>
              <td style={{ padding: "var(--fhis-space-2)" }}>{w.name}</td>
              <td style={{ padding: "var(--fhis-space-2)" }}>
                {WORKER_STATUS_LABELS[w.status]}
              </td>
              <td style={{ padding: "var(--fhis-space-2)" }}>
                <Badge variant={healthBadgeVariant(w.health.level)}>
                  {WORKER_HEALTH_LABELS[w.health.level]}
                </Badge>
              </td>
              <td style={{ padding: "var(--fhis-space-2)", textAlign: "right" }}>
                {w.health.avgExecutionMs}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RuntimeObservabilityLab() {
  const [session, setSession] = useState<RuntimeObservabilityLabSession>(() =>
    createRuntimeObservabilityLab(),
  );
  const [dashboard, setDashboard] = useState<RuntimeDashboardSnapshot | null>(null);

  const handleRefresh = useCallback(() => {
    setDashboard(session.refresh());
  }, [session]);

  const handleDemo = useCallback(() => {
    setDashboard(runObservabilityDemo(session));
  }, [session]);

  const handleReset = useCallback(() => {
    session.reset();
    setSession(createRuntimeObservabilityLab());
    setDashboard(null);
  }, [session]);

  const timelineItems = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.history.slice(0, 15).map((h) => ({
      title: h.summary,
      time: new Date(h.timestamp).toLocaleTimeString(),
      description: h.kind,
    }));
  }, [dashboard]);

  const traceTimeline = useMemo(() => {
    if (!dashboard?.traces[0]) return [];
    return dashboard.traces[0].spans.map((s) => ({
      title: TRACE_STAGE_LABELS[s.stage],
      time: new Date(s.startedAt).toLocaleTimeString(),
      description:
        s.latencyMs !== null
          ? `${s.latencyMs}ms${s.warnings.length ? ` · ${s.warnings.join(", ")}` : ""}`
          : s.warnings.join(", ") || undefined,
    }));
  }, [dashboard]);

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
            <Badge variant="accent">Epic 4.6</Badge>
            <Badge variant="default">Runtime Observability</Badge>
          </div>
          <p style={{ opacity: 0.7, marginBottom: "var(--fhis-space-2)" }}>
            ForgeOS Runtime Lab · Venture: <code>{LAB_MOCK_VENTURE_ID}</code>
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
            Runtime Observability
          </h1>
          <p style={{ opacity: 0.8, marginTop: "var(--fhis-space-2)" }}>
            Health, metrics, traces, alerts, recovery plans, and diagnostics — no auto-healing.
          </p>
        </header>

        <Panel>
          <Stack gap="sm">
            <PanelTitle>Acciones</PanelTitle>
            <div style={{ display: "flex", gap: "var(--fhis-space-2)", flexWrap: "wrap" }}>
              <Button onClick={handleDemo}>Seed demo pipeline</Button>
              <Button variant="secondary" onClick={handleRefresh}>
                Refresh
              </Button>
              <Button variant="secondary" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </Stack>
        </Panel>

        {!dashboard ? (
          <Panel>
            <p style={{ margin: 0, opacity: 0.75 }}>
              Click <strong>Seed demo pipeline</strong> to wire Event Bus → Scheduler → Queue →
              Workers and generate observability data.
            </p>
          </Panel>
        ) : (
          <>
            <Panel>
              <PanelTitle>Overall health</PanelTitle>
              <div style={{ display: "flex", gap: "var(--fhis-space-4)", alignItems: "center", flexWrap: "wrap" }}>
                <Status
                  status={healthToFhis(dashboard.overallHealth)}
                  label={HEALTH_LEVEL_LABELS[dashboard.overallHealth]}
                />
                <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                  Updated {new Date(dashboard.generatedAt).toLocaleTimeString()}
                </span>
              </div>
            </Panel>

            <Panel>
              <PanelTitle>Component map</PanelTitle>
              <ComponentHealthGrid dashboard={dashboard} />
            </Panel>

            <Panel>
              <PanelTitle>Metrics</PanelTitle>
              <Grid cols={4} gap="md">
                <Card>
                  <KpiBlock label="Uptime" value={formatUptime(dashboard.metrics.uptimeMs)} />
                </Card>
                <Card>
                  <KpiBlock label="Avg latency" value={`${dashboard.metrics.avgLatencyMs}ms`} />
                </Card>
                <Card>
                  <KpiBlock label="Throughput" value={dashboard.metrics.taskThroughput} />
                </Card>
                <Card>
                  <KpiBlock label="Queue depth" value={dashboard.metrics.queueDepth} />
                </Card>
                <Card>
                  <KpiBlock label="Active workers" value={dashboard.metrics.activeWorkers} />
                </Card>
                <Card>
                  <KpiBlock label="Blocked workers" value={dashboard.metrics.blockedWorkers} />
                </Card>
                <Card>
                  <KpiBlock label="Errors" value={dashboard.metrics.errorCount} />
                </Card>
                <Card>
                  <KpiBlock label="Dead letters" value={dashboard.metrics.deadLetterCount} />
                </Card>
                <Card>
                  <KpiBlock label="Retries" value={dashboard.metrics.retryCount} />
                </Card>
                <Card>
                  <KpiBlock label="AI calls" value={dashboard.metrics.aiCallCount} />
                </Card>
                <Card>
                  <KpiBlock
                    label="Est. AI cost"
                    value={`$${dashboard.metrics.estimatedAiCost.toFixed(4)}`}
                  />
                </Card>
                <Card>
                  <KpiBlock
                    label="Avg worker ms"
                    value={dashboard.metrics.avgWorkerExecutionMs}
                  />
                </Card>
              </Grid>
            </Panel>

            <Grid cols={2} gap="md">
              <Panel>
                <PanelTitle>Workers</PanelTitle>
                <WorkersTable dashboard={dashboard} />
              </Panel>

              <Panel>
                <PanelTitle>Scheduler</PanelTitle>
                <Stack gap="sm">
                  <p style={{ margin: 0, fontSize: "0.85rem" }}>
                    {dashboard.scheduler.tasks.length} tasks — ready:{" "}
                    {dashboard.scheduler.plan?.readyTaskIds.length ?? 0}, blocked:{" "}
                    {dashboard.scheduler.plan?.blockedTaskIds.length ?? 0}
                  </p>
                  <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.85rem" }}>
                    {dashboard.scheduler.tasks.slice(0, 6).map((t) => (
                      <li key={t.id}>
                        {t.label} — <Badge variant="default">{t.status}</Badge>
                      </li>
                    ))}
                  </ul>
                </Stack>
              </Panel>

              <Panel>
                <PanelTitle>Task queue</PanelTitle>
                <Stack gap="sm">
                  <p style={{ margin: 0, fontSize: "0.85rem" }}>
                    Ready {dashboard.queue.metrics.ready} · Running {dashboard.queue.metrics.running}{" "}
                    · Blocked {dashboard.queue.metrics.blocked} · DL{" "}
                    {dashboard.queue.metrics.deadLetter}
                  </p>
                  <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.85rem" }}>
                    {dashboard.queue.tasks.slice(0, 6).map((t) => (
                      <li key={t.id}>
                        {t.label} — {t.status}
                        {t.recommendedWorkerId ? ` → ${t.recommendedWorkerId}` : ""}
                      </li>
                    ))}
                  </ul>
                </Stack>
              </Panel>

              <Panel>
                <PanelTitle>Execution engine</PanelTitle>
                <Stack gap="sm">
                  {dashboard.components
                    .filter((c) => c.component === "execution-engine")
                    .map((c) => (
                      <Stack key={c.component} gap="sm">
                        <Badge variant={healthBadgeVariant(c.level)}>
                          {HEALTH_LEVEL_LABELS[c.level]}
                        </Badge>
                        <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.85 }}>
                          {EXECUTION_ENGINE_DEPENDENCY_NOTE}
                        </p>
                      </Stack>
                    ))}
                </Stack>
              </Panel>
            </Grid>

            <Grid cols={2} gap="md">
              <Panel>
                <PanelTitle>Recent events</PanelTitle>
                <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.85rem" }}>
                  {dashboard.recentEvents
                    .slice(-10)
                    .reverse()
                    .map((e) => (
                      <li key={e.id}>
                        <Badge variant="default">{e.category}</Badge> {e.type}{" "}
                        <span style={{ opacity: 0.6 }}>{e.source}</span>
                      </li>
                    ))}
                </ul>
              </Panel>

              <Panel>
                <PanelTitle>Alerts</PanelTitle>
                {dashboard.alerts.length === 0 ? (
                  <p style={{ margin: 0, opacity: 0.7 }}>No active alerts.</p>
                ) : (
                  <Stack gap="sm">
                    {dashboard.alerts.map((a) => (
                      <Card key={a.id} padding="sm">
                        <div style={{ display: "flex", gap: "var(--fhis-space-2)", flexWrap: "wrap", alignItems: "center" }}>
                          <Badge variant={alertLevelVariant(a.level)}>{a.level}</Badge>
                          <Badge variant="default">{ALERT_TYPE_LABELS[a.type]}</Badge>
                          <span style={{ fontSize: "0.85rem" }}>{a.message}</span>
                        </div>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Panel>
            </Grid>

            <Grid cols={2} gap="md">
              <Panel>
                <PanelTitle>Errors</PanelTitle>
                {dashboard.errors.length === 0 ? (
                  <p style={{ margin: 0, opacity: 0.7 }}>No errors recorded.</p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.85rem" }}>
                    {dashboard.errors.map((e) => (
                      <li key={e.id}>
                        [{e.severity}] {e.message}
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel>
                <PanelTitle>Diagnostics</PanelTitle>
                {dashboard.diagnostics.length === 0 ? (
                  <p style={{ margin: 0, opacity: 0.7 }}>No issues detected.</p>
                ) : (
                  <Stack gap="sm">
                    {dashboard.diagnostics.map((d) => (
                      <Card key={d.id} padding="sm">
                        <Stack gap="sm">
                          <div style={{ display: "flex", gap: "var(--fhis-space-2)", alignItems: "center", flexWrap: "wrap" }}>
                            <Badge variant={d.severity === "error" ? "red" : "amber"}>
                              {d.category}
                            </Badge>
                            <span style={{ fontSize: "0.85rem" }}>{d.message}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.75 }}>
                            {d.suggestion}
                          </p>
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Panel>
            </Grid>

            <Panel>
              <PanelTitle>Recovery plan (manual only)</PanelTitle>
              {!dashboard.recoveryPlan ? (
                <p style={{ margin: 0, opacity: 0.7 }}>No recovery actions proposed.</p>
              ) : (
                <Stack gap="md">
                  <p style={{ margin: 0, fontSize: "0.9rem" }}>{dashboard.recoveryPlan.summary}</p>
                  <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                    {dashboard.recoveryPlan.actions.map((a, i) => (
                      <li key={i} style={{ marginBottom: "var(--fhis-space-2)" }}>
                        <Badge variant="amber">{RECOVERY_ACTION_LABELS[a.type]}</Badge>{" "}
                        <strong>{a.target}</strong> — {a.reason}
                        <span style={{ opacity: 0.6, fontSize: "0.8rem" }}>
                          {" "}
                          (priority: {a.priority}, not auto-executed)
                        </span>
                      </li>
                    ))}
                  </ul>
                </Stack>
              )}
            </Panel>

            <Grid cols={2} gap="md">
              <Panel>
                <PanelTitle>Performance profiler</PanelTitle>
                {dashboard.profilerSamples.length === 0 ? (
                  <p style={{ margin: 0, opacity: 0.7 }}>No profiler samples yet.</p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.85rem" }}>
                    {dashboard.profilerSamples.map((s) => (
                      <li key={s.id}>
                        {s.label} ({COMPONENT_LABELS[s.component as RuntimeComponentId]}) —{" "}
                        {s.durationMs}ms
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel>
                <PanelTitle>Execution trace</PanelTitle>
                {traceTimeline.length === 0 ? (
                  <p style={{ margin: 0, opacity: 0.7 }}>No traces recorded.</p>
                ) : (
                  <Timeline items={traceTimeline} />
                )}
              </Panel>
            </Grid>

            <Panel>
              <PanelTitle>Observability timeline</PanelTitle>
              {timelineItems.length === 0 ? (
                <p style={{ margin: 0, opacity: 0.7 }}>No history entries.</p>
              ) : (
                <Timeline items={timelineItems} />
              )}
            </Panel>
          </>
        )}
      </Stack>
    </Container>
  );
}
