"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { Card } from "@/components/ui/fhis/Card";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Status } from "@/components/ui/fhis/Status";
import { Timeline } from "@/components/ui/fhis/Timeline";
import { WorkerCard } from "@/components/ui/fhis/WorkerCard";
import type { FhisStatus } from "@/lib/design-system/types";
import {
  createWorkersLab,
  DEPARTMENT_LABELS,
  type WorkersLabSession,
} from "@/lib/lab/workers-lab";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";
import { HEALTH_LEVEL_LABELS } from "@/lib/runtime/workers/health";
import { WORKER_STATUS_LABELS } from "@/lib/runtime/workers/worker-status";
import type { WorkerInstance } from "@/lib/runtime/workers/types";
import type { WorkerStatus } from "@/lib/runtime/workers/worker-status";
import type { WorkerHealthLevel } from "@/lib/runtime/workers/health";
import { getStateLabel } from "@/lib/runtime/state-machine/states";
import type { VentureState } from "@/lib/runtime/state-machine/types";
import type { WorkerTaskResult } from "@/lib/runtime/workers/types";

const VENTURE_STATES: VentureState[] = [
  "IDEA", "DISCOVERY", "RESEARCH", "PRODUCT", "ARCHITECTURE", "UX",
  "BUILD", "QA", "LAUNCH", "GROWTH", "SCALE", "CAPITAL",
];

function workerStatusToFhis(status: WorkerStatus): FhisStatus {
  switch (status) {
    case "RUNNING":
    case "READY":
      return "active";
    case "COMPLETED":
      return "success";
    case "BLOCKED":
    case "PAUSED":
    case "WAITING":
      return "warning";
    case "FAILED":
      return "error";
    case "OFFLINE":
    case "DEPRECATED":
      return "idle";
    default:
      return "pending";
  }
}

function healthToFhis(level: WorkerHealthLevel): FhisStatus {
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

function healthBadgeVariant(level: WorkerHealthLevel): "blue" | "amber" | "red" | "default" {
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

function WorkerRow({
  worker,
  onRunMock,
}: {
  worker: WorkerInstance;
  onRunMock: (id: string) => void;
}) {
  return (
    <tr>
      <td style={{ padding: "var(--fhis-space-2)", fontWeight: 600 }}>{worker.name}</td>
      <td style={{ padding: "var(--fhis-space-2)" }}>
        <Badge variant="default">{DEPARTMENT_LABELS[worker.department] ?? worker.department}</Badge>
      </td>
      <td style={{ padding: "var(--fhis-space-2)" }}>
        <Status status={workerStatusToFhis(worker.status)} label={WORKER_STATUS_LABELS[worker.status]} />
      </td>
      <td style={{ padding: "var(--fhis-space-2)" }}>
        <Badge variant={healthBadgeVariant(worker.health.level)}>
          {HEALTH_LEVEL_LABELS[worker.health.level]}
        </Badge>
      </td>
      <td style={{ padding: "var(--fhis-space-2)", fontSize: "0.8rem", maxWidth: 200 }}>
        {worker.capabilities.map((c) => c.label).join(", ")}
      </td>
      <td style={{ padding: "var(--fhis-space-2)", fontSize: "0.75rem", opacity: 0.8 }}>
        {worker.health.lastExecutionAt
          ? new Date(worker.health.lastExecutionAt).toLocaleTimeString()
          : "—"}
      </td>
      <td style={{ padding: "var(--fhis-space-2)", fontSize: "0.75rem" }}>
        {worker.supportedTasks.slice(0, 3).join(", ")}
        {worker.supportedTasks.length > 3 ? "…" : ""}
      </td>
      <td style={{ padding: "var(--fhis-space-2)" }}>
        <Button variant="secondary" onClick={() => onRunMock(worker.id)}>
          Ejecutar Mock
        </Button>
      </td>
    </tr>
  );
}

export function WorkersLab() {
  const [session, setSession] = useState<WorkersLabSession>(() => createWorkersLab());
  const [ventureState, setVentureState] = useState<VentureState>("RESEARCH");
  const [lastResults, setLastResults] = useState<WorkerTaskResult[]>([]);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  const workers = useMemo(() => {
    void tick;
    return session.getWorkers();
  }, [session, tick]);

  const metrics = useMemo(() => {
    void tick;
    return session.getMetrics();
  }, [session, tick]);

  const telemetry = useMemo(() => {
    void tick;
    return session.getTelemetry();
  }, [session, tick]);

  const events = useMemo(() => {
    void tick;
    return session.getWorkerEvents();
  }, [session, tick]);

  const transitions = useMemo(() => {
    void tick;
    return session.getStatusTransitions();
  }, [session, tick]);

  const handleStateChange = useCallback(
    (state: VentureState) => {
      session.setVentureState(state);
      setVentureState(state);
      refresh();
    },
    [session, refresh],
  );

  const handleRunMock = useCallback(
    (workerId: string) => {
      const result = session.runMockTask(workerId);
      setLastResults((prev) => [result, ...prev].slice(0, 10));
      refresh();
    },
    [session, refresh],
  );

  const handleDemo = useCallback(() => {
    const results = session.runMockDemo();
    setLastResults(results);
    refresh();
  }, [session, refresh]);

  const handleReset = useCallback(() => {
    session.reset();
    const next = createWorkersLab();
    setSession(next);
    setVentureState("RESEARCH");
    setLastResults([]);
    refresh();
  }, [session, refresh]);

  return (
    <Container style={{ paddingBlock: "var(--fhis-space-6)" }}>
      <Stack gap="lg">
        <header>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", marginBottom: "var(--fhis-space-2)" }}>
            <Badge variant="accent">Epic 4.3</Badge>
            <Badge variant="default">Worker Runtime</Badge>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Worker Runtime</h1>
          <p style={{ opacity: 0.8, marginTop: "var(--fhis-space-2)" }}>
            Official department workers — registry, health, capabilities, mock execution through Event Bus → Scheduler → State Machine. No real AI.
          </p>
        </header>

        <Panel>
          <Stack gap="sm">
            <p style={{ margin: 0, fontWeight: 600 }}>Venture context</p>
            <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.8 }}>
              <code>{LAB_MOCK_VENTURE_ID}</code> · State: <strong>{getStateLabel(ventureState)}</strong>
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--fhis-space-2)" }}>
              {VENTURE_STATES.map((s) => (
                <Button
                  key={s}
                  variant={s === ventureState ? "primary" : "secondary"}
                  onClick={() => handleStateChange(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "var(--fhis-space-2)", flexWrap: "wrap" }}>
              <Button variant="primary" onClick={handleDemo}>
                Ejecutar Mock (demo)
              </Button>
              <Button variant="secondary" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </Stack>
        </Panel>

        <Grid cols={4} gap="md">
          <Card padding="md">
            <KpiBlock label="Workers" value={metrics.totalWorkers} />
          </Card>
          <Card padding="md">
            <KpiBlock label="Executions" value={metrics.totalExecutions} />
          </Card>
          <Card padding="md">
            <KpiBlock label="Successes" value={metrics.totalSuccesses} />
          </Card>
          <Card padding="md">
            <KpiBlock label="Avg ms" value={metrics.avgExecutionMs} />
          </Card>
        </Grid>

        <Grid cols={3} gap="md">
          {workers.slice(0, 6).map((w) => (
            <WorkerCard
              key={w.id}
              name={w.name}
              role={DEPARTMENT_LABELS[w.department] ?? w.department}
              status={workerStatusToFhis(w.status)}
            />
          ))}
        </Grid>

        <Panel>
          <p style={{ margin: "0 0 var(--fhis-space-3)", fontWeight: 600 }}>All workers</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--fhis-border-subtle)" }}>
                  <th style={{ padding: "var(--fhis-space-2)" }}>Worker</th>
                  <th style={{ padding: "var(--fhis-space-2)" }}>Department</th>
                  <th style={{ padding: "var(--fhis-space-2)" }}>Status</th>
                  <th style={{ padding: "var(--fhis-space-2)" }}>Health</th>
                  <th style={{ padding: "var(--fhis-space-2)" }}>Capabilities</th>
                  <th style={{ padding: "var(--fhis-space-2)" }}>Last run</th>
                  <th style={{ padding: "var(--fhis-space-2)" }}>Tasks</th>
                  <th style={{ padding: "var(--fhis-space-2)" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w) => (
                  <WorkerRow key={w.id} worker={w} onRunMock={handleRunMock} />
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Grid cols={2} gap="md">
          <Panel>
            <p style={{ margin: "0 0 var(--fhis-space-3)", fontWeight: 600 }}>Status transitions</p>
            <Timeline
              items={transitions.slice(-12).reverse().map((t) => ({
                title: `${t.from} → ${t.to}`,
                time: new Date(t.timestamp).toLocaleTimeString(),
                description: t.reason,
              }))}
            />
          </Panel>

          <Panel>
            <p style={{ margin: "0 0 var(--fhis-space-3)", fontWeight: 600 }}>Worker events</p>
            <Timeline
              items={events.slice(0, 12).map((e) => ({
                title: e.type,
                time: new Date(e.timestamp).toLocaleTimeString(),
                description: JSON.stringify(e.payload).slice(0, 80),
              }))}
            />
          </Panel>
        </Grid>

        {lastResults.length > 0 && (
          <Panel>
            <p style={{ margin: "0 0 var(--fhis-space-3)", fontWeight: 600 }}>Last mock results</p>
            <Stack gap="sm">
              {lastResults.map((r, i) => (
                <Card key={`${r.taskId}-${i}`} padding="sm" variant="ghost">
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", flexWrap: "wrap" }}>
                    <Status status={r.success ? "success" : "error"} label={r.workerId} />
                    <Badge variant="blue">{r.taskType}</Badge>
                    <span style={{ fontSize: "0.8rem", opacity: 0.8 }}>{r.durationMs}ms</span>
                    {r.errors.length > 0 && (
                      <span style={{ fontSize: "0.8rem", color: "var(--fhis-color-error)" }}>
                        {r.errors.join("; ")}
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </Stack>
          </Panel>
        )}

        {telemetry.length > 0 && (
          <Panel>
            <p style={{ margin: "0 0 var(--fhis-space-3)", fontWeight: 600 }}>Telemetry</p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid var(--fhis-border-subtle)" }}>
                    <th style={{ padding: "var(--fhis-space-2)" }}>Worker</th>
                    <th style={{ padding: "var(--fhis-space-2)" }}>Task</th>
                    <th style={{ padding: "var(--fhis-space-2)" }}>State</th>
                    <th style={{ padding: "var(--fhis-space-2)" }}>Duration</th>
                    <th style={{ padding: "var(--fhis-space-2)" }}>Provider</th>
                  </tr>
                </thead>
                <tbody>
                  {telemetry.slice(0, 15).map((t) => (
                    <tr key={t.id}>
                      <td style={{ padding: "var(--fhis-space-2)" }}>{t.workerId}</td>
                      <td style={{ padding: "var(--fhis-space-2)" }}>{t.taskType}</td>
                      <td style={{ padding: "var(--fhis-space-2)" }}>{t.ventureState}</td>
                      <td style={{ padding: "var(--fhis-space-2)" }}>{t.durationMs}ms</td>
                      <td style={{ padding: "var(--fhis-space-2)" }}>{t.provider ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </Stack>
    </Container>
  );
}
