"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { Card } from "@/components/ui/fhis/Card";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Status } from "@/components/ui/fhis/Status";
import { Timeline } from "@/components/ui/fhis/Timeline";
import type { FhisStatus } from "@/lib/design-system/types";
import {
  createExecutionEngineLab,
  type ExecutionEngineLabSession,
} from "@/lib/lab/execution-engine-lab";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";
import {
  PIPELINE_STATE_LABELS,
  type ExecutionSession,
  type ExecutionResult,
} from "@/lib/runtime/execution-engine";
import {
  QUEUE_STATUS_LABELS,
  QUEUE_TASK_LABELS,
} from "@/lib/runtime/task-queue";
import { getStateLabel } from "@/lib/runtime/state-machine/states";

function pipelineToFhis(state: string): FhisStatus {
  switch (state) {
    case "COMPLETED":
      return "success";
    case "RUNNING":
    case "DISPATCHED":
    case "VALIDATED":
    case "FINISHED":
      return "active";
    case "FAILED":
    case "DEAD_LETTER":
      return "error";
    case "RETRY":
      return "warning";
    default:
      return "pending";
  }
}

function PanelTitle({ children }: { children: ReactNode }) {
  return <p style={{ margin: "0 0 var(--fhis-space-2)", fontWeight: 600 }}>{children}</p>;
}

export function ExecutionEngineLab() {
  const [session] = useState<ExecutionEngineLabSession>(() =>
    createExecutionEngineLab(LAB_MOCK_VENTURE_ID),
  );
  const [tick, setTick] = useState(0);
  const [lastResults, setLastResults] = useState<ExecutionResult[]>([]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const runMock = useCallback(() => {
    const results = session.runMockRuntime();
    setLastResults(results);
    refresh();
  }, [session, refresh]);

  const sessions = useMemo(() => session.getSessions(), [session, tick]);
  const latest = useMemo(() => session.getLatestSession(), [session, tick]);
  const queue = useMemo(() => session.getQueueSnapshot(), [session, tick]);
  const events = useMemo(() => session.getExecutionEvents(), [session, tick]);
  const memoryWrites = useMemo(() => session.getMemoryWrites(), [session, tick]);
  const decisionWrites = useMemo(() => session.getDecisionWrites(), [session, tick]);
  const metrics = useMemo(() => session.getMetrics(), [session, tick]);
  const futureAdapters = useMemo(() => session.getFutureAdapters(), [session, tick]);
  const ventureState = useMemo(() => session.getVentureState(), [session, tick]);

  const successCount = lastResults.filter((r) => r.success).length;
  const skippedCount = lastResults.filter((r) => r.skipped).length;

  return (
    <Container style={{ paddingBlock: "var(--fhis-space-6)" }}>
      <Stack gap="lg">
        <header>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", marginBottom: "var(--fhis-space-2)" }}>
            <Badge variant="accent">Epic 4.5</Badge>
            <Badge variant="default">Execution Engine RC1</Badge>
          </div>
          <p style={{ opacity: 0.7, marginBottom: "var(--fhis-space-2)" }}>
            ForgeOS Runtime Lab · Venture: <code>{session.ventureId}</code>
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Execution Engine</h1>
          <p style={{ opacity: 0.8, marginTop: "var(--fhis-space-2)" }}>
            Motor central del runtime: Scheduler → Queue → Worker → Memory → Decision Graph → Telemetry.
          </p>
        </header>

        <Panel>
          <Stack gap="sm">
            <PanelTitle>Acciones</PanelTitle>
            <div style={{ display: "flex", gap: "var(--fhis-space-2)", flexWrap: "wrap", alignItems: "center" }}>
              <Button onClick={runMock}>Run Mock Runtime</Button>
              <Badge variant="blue">{getStateLabel(ventureState)}</Badge>
              <Status status="active" label="Runtime Kernel RC1" />
            </div>
          </Stack>
        </Panel>

        <Grid cols={4} gap="md">
          <Card>
            <KpiBlock label="Sessions" value={String(metrics.totalSessions)} />
          </Card>
          <Card>
            <KpiBlock label="Completed" value={String(metrics.completedSessions)} />
          </Card>
          <Card>
            <KpiBlock label="Last run OK" value={String(successCount)} />
          </Card>
          <Card>
            <KpiBlock label="Avg runtime" value={`${Math.round(metrics.avgDurationMs)}ms`} />
          </Card>
        </Grid>

        <Grid cols={2} gap="md">
          <Panel>
            <PanelTitle>Runtime Status</PanelTitle>
            <Stack gap="sm">
              <div>Venture state: <strong>{getStateLabel(ventureState)}</strong></div>
              <div>Active sessions: {metrics.activeSessions}</div>
              <div>Failure rate: {(metrics.failureRate * 100).toFixed(1)}%</div>
              <div>Retries (telemetry): {metrics.telemetry.retryCount}</div>
              <div>Last run skipped: {skippedCount}</div>
            </Stack>
          </Panel>

          <Panel>
            <PanelTitle>Pipeline (latest session)</PanelTitle>
            {latest ? (
              <SessionPipeline session={latest} />
            ) : (
              <p style={{ opacity: 0.7 }}>Run Mock Runtime to create sessions.</p>
            )}
          </Panel>
        </Grid>

        <Grid cols={2} gap="md">
          <Panel>
            <PanelTitle>Execution Queue</PanelTitle>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr>
                    <th align="left">Task</th>
                    <th align="left">Status</th>
                    <th align="left">Worker</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.tasks.slice(0, 12).map((t) => (
                    <tr key={t.id}>
                      <td style={{ padding: "4px 0" }}>{QUEUE_TASK_LABELS[t.type] ?? t.type}</td>
                      <td>{QUEUE_STATUS_LABELS[t.status]}</td>
                      <td>{t.recommendedWorkerId ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel>
            <PanelTitle>Sessions</PanelTitle>
            <Stack gap="sm">
              {sessions.slice(0, 6).map((s) => (
                <div key={s.sessionId} style={{ fontSize: "0.85rem" }}>
                  <Badge variant={s.status === "COMPLETED" ? "blue" : s.status === "FAILED" ? "red" : "default"}>
                    {s.taskType}
                  </Badge>{" "}
                  {s.workerId} — {PIPELINE_STATE_LABELS[s.pipelineState]} ({s.duration ?? 0}ms)
                </div>
              ))}
              {sessions.length === 0 && <p style={{ opacity: 0.7 }}>No sessions yet.</p>}
            </Stack>
          </Panel>
        </Grid>

        <Grid cols={2} gap="md">
          <Panel>
            <PanelTitle>Events</PanelTitle>
            <Timeline
              items={events.slice(0, 12).map((e) => ({
                title: e.type,
                time: e.timestamp.slice(11, 19),
              }))}
            />
          </Panel>

          <Panel>
            <PanelTitle>Telemetry & Metrics</PanelTitle>
            <Stack gap="sm" style={{ fontSize: "0.85rem" }}>
              <div>Avg queue wait: {Math.round(metrics.telemetry.avgQueueWaitMs)}ms</div>
              <div>Avg scheduler delay: {Math.round(metrics.telemetry.avgSchedulerDelayMs)}ms</div>
              <div>Provider usage: {Object.keys(metrics.telemetry.providerUsage).join(", ") || "—"}</div>
              <div>Worker usage: {Object.entries(metrics.workerUsage).map(([k, v]) => `${k}:${v}`).join(", ") || "—"}</div>
            </Stack>
          </Panel>
        </Grid>

        <Grid cols={2} gap="md">
          <Panel>
            <PanelTitle>Memory Writes</PanelTitle>
            <Stack gap="sm" style={{ fontSize: "0.85rem" }}>
              {memoryWrites.map((m) => (
                <div key={m.id}>{m.summary}</div>
              ))}
              {memoryWrites.length === 0 && <p style={{ opacity: 0.7 }}>No memory writes.</p>}
            </Stack>
          </Panel>

          <Panel>
            <PanelTitle>Decision Writes</PanelTitle>
            <Stack gap="sm" style={{ fontSize: "0.85rem" }}>
              {decisionWrites.map((d) => (
                <div key={d.id}>
                  <strong>{d.title}</strong> — {d.nodeType} ({(d.confidence * 100).toFixed(0)}%)
                </div>
              ))}
              {decisionWrites.length === 0 && <p style={{ opacity: 0.7 }}>No decision writes.</p>}
            </Stack>
          </Panel>
        </Grid>

        <Panel>
          <PanelTitle>Future Adapters (Coming Soon)</PanelTitle>
          <Grid cols={3} gap="sm">
            {futureAdapters.map((a) => (
              <Card key={a.id}>
                <Stack gap="sm">
                  <strong>{a.label}</strong>
                  <Badge variant="default">Coming Soon</Badge>
                  <span style={{ fontSize: "0.8rem", opacity: 0.8 }}>{a.description}</span>
                </Stack>
              </Card>
            ))}
          </Grid>
        </Panel>
      </Stack>
    </Container>
  );
}

function SessionPipeline({ session }: { session: ExecutionSession }) {
  return (
    <Stack gap="sm">
      <div style={{ fontSize: "0.85rem" }}>
        Session <code>{session.sessionId.slice(-10)}</code> — Worker {session.workerId}
      </div>
      <Status
        status={pipelineToFhis(session.pipelineState)}
        label={PIPELINE_STATE_LABELS[session.pipelineState]}
      />
      <Timeline
        items={session.events.slice(-8).map((e) => ({
          title: e.type,
          time: e.timestamp.slice(11, 19),
          description: e.detail,
        }))}
      />
      {session.warnings.length > 0 && (
        <div style={{ fontSize: "0.8rem", color: "var(--fhis-color-warning)" }}>
          Warnings: {session.warnings.join("; ")}
        </div>
      )}
      {session.errors.length > 0 && (
        <div style={{ fontSize: "0.8rem", color: "var(--fhis-color-error)" }}>
          Errors: {session.errors.join("; ")}
        </div>
      )}
    </Stack>
  );
}
