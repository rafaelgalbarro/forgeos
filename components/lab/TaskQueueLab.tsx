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
  createTaskQueueLab,
  runTaskQueueDemo,
  type TaskQueueLabSession,
} from "@/lib/lab/task-queue-lab";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";
import {
  QUEUE_PRIORITY_LABELS,
  QUEUE_STATUS_LABELS,
  QUEUE_TASK_LABELS,
  type QueueTask,
  type QueueTaskPriority,
  type QueueTaskStatus,
} from "@/lib/runtime/task-queue";

function statusToFhis(status: QueueTaskStatus): FhisStatus {
  switch (status) {
    case "READY":
    case "RUNNING":
      return "active";
    case "COMPLETED":
      return "success";
    case "BLOCKED":
    case "WAITING":
      return "warning";
    case "FAILED":
    case "TIMEOUT":
    case "DEAD_LETTER":
      return "error";
    case "RETRYING":
      return "pending";
    case "CANCELLED":
      return "idle";
    default:
      return "pending";
  }
}

function priorityVariant(priority: QueueTaskPriority): "red" | "amber" | "blue" | "default" {
  switch (priority) {
    case "P0_CRITICAL":
      return "red";
    case "P1_HIGH":
      return "amber";
    case "P2_MEDIUM":
      return "blue";
    default:
      return "default";
  }
}

const PRIORITIES: QueueTaskPriority[] = ["P0_CRITICAL", "P1_HIGH", "P2_MEDIUM", "P3_LOW"];

function TaskRow({
  task,
  onChangePriority,
  onCancel,
  onDeadLetter,
}: {
  task: QueueTask;
  onChangePriority: (id: string, p: QueueTaskPriority) => void;
  onCancel: (id: string) => void;
  onDeadLetter: (id: string) => void;
}) {
  const [showPriority, setShowPriority] = useState(false);

  return (
    <tr>
      <td style={{ padding: "var(--fhis-space-2)", fontFamily: "monospace", fontSize: "0.75rem" }}>
        {task.id.slice(-8)}
      </td>
      <td style={{ padding: "var(--fhis-space-2)" }}>{QUEUE_TASK_LABELS[task.type] ?? task.type}</td>
      <td style={{ padding: "var(--fhis-space-2)" }}>
        <Badge variant={priorityVariant(task.priority)}>{QUEUE_PRIORITY_LABELS[task.priority]}</Badge>
      </td>
      <td style={{ padding: "var(--fhis-space-2)" }}>
        <Status status={statusToFhis(task.status)} label={QUEUE_STATUS_LABELS[task.status]} />
      </td>
      <td style={{ padding: "var(--fhis-space-2)", fontSize: "0.85rem" }}>
        {task.dependsOn.length > 0 ? task.dependsOn.map((d) => d.slice(-6)).join(", ") : "—"}
        {task.dependencyMilestones.length > 0 && (
          <div style={{ fontSize: "0.7rem", opacity: 0.7 }}>
            {task.dependencyMilestones.join(", ")}
          </div>
        )}
      </td>
      <td style={{ padding: "var(--fhis-space-2)", fontSize: "0.85rem" }}>
        {task.recommendedWorkerId ?? "—"}
      </td>
      <td style={{ padding: "var(--fhis-space-2)", textAlign: "center" }}>
        {task.attemptCount}/{task.maxRetries}
      </td>
      <td style={{ padding: "var(--fhis-space-2)", fontSize: "0.75rem", opacity: 0.8 }}>
        {task.enqueuedAt.slice(11, 19)}
      </td>
      <td style={{ padding: "var(--fhis-space-2)" }}>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          <Button variant="secondary" onClick={() => setShowPriority((s) => !s)}>
            Prioridad
          </Button>
          <Button variant="secondary" onClick={() => onCancel(task.id)}>
            Cancelar
          </Button>
          <Button variant="secondary" onClick={() => onDeadLetter(task.id)}>
            DLQ
          </Button>
        </div>
        {showPriority && (
          <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap" }}>
            {PRIORITIES.map((p) => (
              <Button key={p} variant="secondary" onClick={() => { onChangePriority(task.id, p); setShowPriority(false); }}>
                {p.replace("P", "").slice(0, 1)}
              </Button>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}

export function TaskQueueLab() {
  const [session, setSession] = useState<TaskQueueLabSession>(() => createTaskQueueLab());
  const [tick, setTick] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const snapshot = useMemo(() => {
    void tick;
    return session.getSnapshot();
  }, [session, tick]);

  const plan = useMemo(() => {
    void tick;
    return session.getPlan();
  }, [session, tick]);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  const handleGenerate = useCallback(() => {
    session.generateMockTasks();
    refresh();
  }, [session, refresh]);

  const handleDemo = useCallback(() => {
    runTaskQueueDemo(session);
    refresh();
  }, [session, refresh]);

  const handleReset = useCallback(() => {
    session.reset();
    setSession(createTaskQueueLab());
    setSelectedId(null);
    refresh();
  }, [session, refresh]);

  const handleChangePriority = useCallback(
    (id: string, priority: QueueTaskPriority) => {
      session.changePriority(id, priority);
      refresh();
    },
    [session, refresh],
  );

  const handleCancel = useCallback(
    (id: string) => {
      session.cancelTask(id);
      refresh();
    },
    [session, refresh],
  );

  const handleDeadLetter = useCallback(
    (id: string) => {
      session.moveToDeadLetter(id);
      refresh();
    },
    [session, refresh],
  );

  const selectedTask = selectedId
    ? snapshot.tasks.find((t) => t.id === selectedId)
    : snapshot.tasks[0];

  const timelineItems = snapshot.tasks.slice(0, 8).map((t) => ({
    title: `${QUEUE_TASK_LABELS[t.type]} — ${QUEUE_STATUS_LABELS[t.status]}`,
    time: t.updatedAt.slice(11, 19),
    description: t.recommendedWorkerId
      ? `Worker: ${t.recommendedWorkerId} · pos ${t.queuePosition ?? "—"}`
      : `Position: ${t.queuePosition ?? "—"}`,
  }));

  return (
    <Container style={{ paddingBlock: "var(--fhis-space-6)" }}>
      <Stack gap="lg">
        <header>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", marginBottom: "var(--fhis-space-2)" }}>
            <Badge variant="accent">Epic 4.4</Badge>
            <Badge variant="default">Task Queue</Badge>
          </div>
          <p style={{ opacity: 0.7, marginBottom: "var(--fhis-space-2)" }}>
            ForgeOS Runtime Lab · Venture: <code>{LAB_MOCK_VENTURE_ID}</code>
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Task Queue</h1>
          <p style={{ opacity: 0.8, marginTop: "var(--fhis-space-2)" }}>
            Cola oficial del runtime: prioridades, dependencias, reintentos y dead letter — sin ejecución real.
          </p>
        </header>

        <Panel>
          <Stack gap="sm">
            <p style={{ margin: 0, fontWeight: 600 }}>Acciones</p>
            <div style={{ display: "flex", gap: "var(--fhis-space-2)", flexWrap: "wrap" }}>
              <Button onClick={handleGenerate}>Generar tareas mock</Button>
              <Button variant="secondary" onClick={handleDemo}>Demo completo</Button>
              <Button variant="secondary" onClick={handleReset}>Reset</Button>
            </div>
          </Stack>
        </Panel>

        <Grid cols={4} gap="md">
          <Card>
            <KpiBlock label="Total" value={snapshot.metrics.totalTasks} />
          </Card>
          <Card>
            <KpiBlock label="Ready" value={snapshot.metrics.ready} />
          </Card>
          <Card>
            <KpiBlock label="Blocked" value={snapshot.metrics.blocked} />
          </Card>
          <Card>
            <KpiBlock label="Dead Letter" value={snapshot.metrics.deadLetter} />
          </Card>
          <Card>
            <KpiBlock label="Avg wait (ms)" value={snapshot.metrics.avgWaitMs} />
          </Card>
          <Card>
            <KpiBlock label="Max wait (ms)" value={snapshot.metrics.maxWaitMs} />
          </Card>
          <Card>
            <KpiBlock label="Retries" value={snapshot.metrics.retryCount} />
          </Card>
          <Card>
            <KpiBlock label="Failures" value={snapshot.metrics.failureCount} />
          </Card>
        </Grid>

        <Grid cols={2} gap="md">
          <Panel>
            <Stack gap="sm">
              <p style={{ margin: 0, fontWeight: 600 }}>Plan del scheduler</p>
              <p style={{ margin: 0, fontSize: "0.9rem" }}>
                Next: {plan.nextTask ? QUEUE_TASK_LABELS[plan.nextTask.type] : "—"}
              </p>
              <p style={{ margin: 0, fontSize: "0.9rem" }}>
                Worker recomendado: <code>{plan.recommendedWorkerId ?? "—"}</code>
              </p>
              <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.8 }}>
                Ready: {plan.readyTaskIds.length} · Blocked: {plan.blockedTaskIds.length}
              </p>
            </Stack>
          </Panel>
          <Panel>
            <p style={{ margin: "0 0 var(--fhis-space-2)", fontWeight: 600 }}>Timeline</p>
            <Timeline items={timelineItems} />
          </Panel>
        </Grid>

        <Panel>
          <p style={{ margin: "0 0 var(--fhis-space-3)", fontWeight: 600 }}>Task list</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--fhis-border-subtle)" }}>
                  <th style={{ padding: "var(--fhis-space-2)" }}>ID</th>
                  <th style={{ padding: "var(--fhis-space-2)" }}>Type</th>
                  <th style={{ padding: "var(--fhis-space-2)" }}>Priority</th>
                  <th style={{ padding: "var(--fhis-space-2)" }}>Status</th>
                  <th style={{ padding: "var(--fhis-space-2)" }}>Deps</th>
                  <th style={{ padding: "var(--fhis-space-2)" }}>Worker</th>
                  <th style={{ padding: "var(--fhis-space-2)" }}>Retries</th>
                  <th style={{ padding: "var(--fhis-space-2)" }}>Time</th>
                  <th style={{ padding: "var(--fhis-space-2)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.tasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => setSelectedId(task.id)}
                    style={{
                      borderBottom: "1px solid var(--fhis-border-subtle)",
                      background: selectedTask?.id === task.id ? "var(--fhis-surface-raised)" : undefined,
                      cursor: "pointer",
                    }}
                  >
                    <TaskRow
                      task={task}
                      onChangePriority={handleChangePriority}
                      onCancel={handleCancel}
                      onDeadLetter={handleDeadLetter}
                    />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {snapshot.deadLetter.length > 0 && (
          <Panel>
            <p style={{ margin: "0 0 var(--fhis-space-3)", fontWeight: 600 }}>Dead letter</p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--fhis-border-subtle)" }}>
                  <th style={{ padding: "var(--fhis-space-2)" }}>Task</th>
                  <th style={{ padding: "var(--fhis-space-2)" }}>Cause</th>
                  <th style={{ padding: "var(--fhis-space-2)" }}>Worker</th>
                  <th style={{ padding: "var(--fhis-space-2)" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.deadLetter.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: "1px solid var(--fhis-border-subtle)" }}>
                    <td style={{ padding: "var(--fhis-space-2)" }}>{entry.label}</td>
                    <td style={{ padding: "var(--fhis-space-2)" }}>{entry.cause}</td>
                    <td style={{ padding: "var(--fhis-space-2)" }}>{entry.workerId ?? "—"}</td>
                    <td style={{ padding: "var(--fhis-space-2)", fontSize: "0.8rem" }}>
                      {entry.movedAt.slice(0, 19)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}
      </Stack>
    </Container>
  );
}
