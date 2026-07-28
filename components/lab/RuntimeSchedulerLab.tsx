"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { Status } from "@/components/ui/fhis/Status";
import type { FhisStatus } from "@/lib/design-system/types";
import {
  MOCK_EVENT_DEFINITIONS,
  createRuntimeSchedulerLab,
  runSchedulerDemoSequence,
  type RuntimeSchedulerLabSession,
} from "@/lib/lab/runtime-scheduler-lab";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";
import type { RuntimeEventType } from "@/lib/runtime/event-bus/types";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_LABELS,
} from "@/lib/runtime/scheduler";
import type { SchedulerTask, TaskPriority, TaskStatus } from "@/lib/runtime/scheduler/types";

function taskStatusToFhis(status: TaskStatus): FhisStatus {
  switch (status) {
    case "ready":
    case "running":
      return "active";
    case "completed":
      return "success";
    case "blocked":
      return "warning";
    case "failed":
      return "error";
    case "cancelled":
      return "idle";
    default:
      return "pending";
  }
}

function priorityVariant(priority: TaskPriority): "red" | "amber" | "blue" | "default" {
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

function TaskRow({ task, tasksById }: { task: SchedulerTask; tasksById: Map<string, SchedulerTask> }) {
  const depLabels = task.dependsOn.map((id) => {
    const dep = tasksById.get(id);
    return dep ? TASK_LABELS[dep.type] : id;
  });

  return (
    <tr>
      <td style={{ padding: "var(--fhis-space-2)", fontFamily: "monospace", fontSize: "0.75rem" }}>
        {task.id.slice(-8)}
      </td>
      <td style={{ padding: "var(--fhis-space-2)" }}>{TASK_LABELS[task.type]}</td>
      <td style={{ padding: "var(--fhis-space-2)" }}>
        <Badge variant={priorityVariant(task.priority)}>{PRIORITY_LABELS[task.priority]}</Badge>
      </td>
      <td style={{ padding: "var(--fhis-space-2)" }}>
        <Status status={taskStatusToFhis(task.status)} label={STATUS_LABELS[task.status]} />
      </td>
      <td style={{ padding: "var(--fhis-space-2)", fontSize: "0.85rem", opacity: 0.85 }}>
        {depLabels.length > 0 ? depLabels.join(", ") : "—"}
      </td>
      <td style={{ padding: "var(--fhis-space-2)", fontSize: "0.75rem", opacity: 0.7 }}>
        {task.sourceEventType}
      </td>
    </tr>
  );
}

export function RuntimeSchedulerLab() {
  const [session, setSession] = useState<RuntimeSchedulerLabSession>(() => createRuntimeSchedulerLab());
  const [tick, setTick] = useState(0);

  const snapshot = useMemo(() => {
    void tick;
    return session.getSnapshot();
  }, [session, tick]);

  const tasksById = useMemo(
    () => new Map(snapshot.tasks.map((t) => [t.id, t])),
    [snapshot.tasks],
  );

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  const handleMockEvent = useCallback(
    (type: RuntimeEventType) => {
      session.publishMockEvent(type);
      refresh();
    },
    [session, refresh],
  );

  const handleDemo = useCallback(() => {
    runSchedulerDemoSequence(session);
    refresh();
  }, [session, refresh]);

  const handleReset = useCallback(() => {
    session.reset();
    setSession(createRuntimeSchedulerLab());
    setTick((n) => n + 1);
  }, [session]);

  const readyTasks = snapshot.tasks.filter((t) => snapshot.plan?.readyTaskIds.includes(t.id));
  const blockedTasks = snapshot.tasks.filter((t) => snapshot.plan?.blockedTaskIds.includes(t.id));

  return (
    <Container style={{ paddingBlock: "var(--fhis-space-6)" }}>
      <Stack gap="lg">
        <header>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", marginBottom: "var(--fhis-space-2)" }}>
            <Badge variant="accent">Epic 4.1</Badge>
            <Badge variant="default">Runtime Scheduler</Badge>
          </div>
          <p style={{ opacity: 0.7, marginBottom: "var(--fhis-space-2)" }}>
            ForgeOS Runtime Lab · Venture: <code>{LAB_MOCK_VENTURE_ID}</code>
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
            Runtime Scheduler
          </h1>
          <p style={{ opacity: 0.8, marginTop: "var(--fhis-space-2)" }}>
            Planifica tareas desde el Event Bus: prioridades, dependencias y plan de ejecución — sin ejecutar workers.
          </p>
        </header>

        <Panel>
          <Stack gap="sm">
            <p style={{ margin: 0, fontWeight: 600 }}>Mock events</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--fhis-space-2)" }}>
              {MOCK_EVENT_DEFINITIONS.map((def) => (
                <Button key={def.type} variant="secondary" onClick={() => handleMockEvent(def.type)}>
                  {def.label}
                </Button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "var(--fhis-space-2)", flexWrap: "wrap" }}>
              <Button onClick={handleDemo}>Run demo sequence</Button>
              <Button variant="secondary" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </Stack>
        </Panel>

        <Grid cols={4} gap="md">
          {(["P0_CRITICAL", "P1_HIGH", "P2_MEDIUM", "P3_LOW"] as TaskPriority[]).map((p) => (
            <Panel key={p}>
              <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.7 }}>{PRIORITY_LABELS[p]}</p>
              <p style={{ margin: "var(--fhis-space-1) 0 0", fontSize: "1.5rem", fontWeight: 700 }}>
                {snapshot.taskCountByPriority[p]}
              </p>
            </Panel>
          ))}
        </Grid>

        <Grid cols={2} gap="md">
          <Panel>
            <Stack gap="sm">
              <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)" }}>
                <Status status="active" label="Ready" />
                <Badge variant="blue">{readyTasks.length}</Badge>
              </div>
              {readyTasks.length === 0 ? (
                <p style={{ margin: 0, opacity: 0.7 }}>No ready tasks yet.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                  {readyTasks.map((t) => (
                    <li key={t.id}>
                      {TASK_LABELS[t.type]} · {PRIORITY_LABELS[t.priority]}
                    </li>
                  ))}
                </ul>
              )}
            </Stack>
          </Panel>

          <Panel>
            <Stack gap="sm">
              <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)" }}>
                <Status status="warning" label="Blocked" />
                <Badge variant="amber">{blockedTasks.length}</Badge>
              </div>
              {blockedTasks.length === 0 ? (
                <p style={{ margin: 0, opacity: 0.7 }}>No blocked tasks.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                  {blockedTasks.map((t) => (
                    <li key={t.id}>
                      {TASK_LABELS[t.type]} · waiting on{" "}
                      {t.dependsOn
                        .map((id) => TASK_LABELS[tasksById.get(id)?.type ?? "DISCOVERY_REVIEW"])
                        .join(", ")}
                    </li>
                  ))}
                </ul>
              )}
            </Stack>
          </Panel>
        </Grid>

        <Panel>
          <Stack gap="sm">
            <p style={{ margin: 0, fontWeight: 600 }}>Execution plan</p>
            {!snapshot.plan || snapshot.plan.waves.length === 0 ? (
              <p style={{ margin: 0, opacity: 0.7 }}>Publish events to generate a plan.</p>
            ) : (
              snapshot.plan.waves.map((wave) => (
                <div
                  key={wave.waveIndex}
                  style={{
                    borderLeft: "3px solid var(--fhis-color-accent, #6366f1)",
                    paddingLeft: "var(--fhis-space-3)",
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 600 }}>Wave {wave.waveIndex + 1}</p>
                  <ul style={{ margin: "var(--fhis-space-1) 0 0", paddingLeft: "1.25rem" }}>
                    {wave.taskIds.map((id) => {
                      const task = tasksById.get(id);
                      if (!task) return null;
                      return (
                        <li key={id}>
                          {TASK_LABELS[task.type]} · {PRIORITY_LABELS[task.priority]} ·{" "}
                          {STATUS_LABELS[task.status]}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </Stack>
        </Panel>

        <Panel>
          <Stack gap="sm">
            <p style={{ margin: 0, fontWeight: 600 }}>Generated tasks ({snapshot.tasks.length})</p>
            {snapshot.tasks.length === 0 ? (
              <p style={{ margin: 0, opacity: 0.7 }}>No tasks yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                      <th style={{ padding: "var(--fhis-space-2)" }}>ID</th>
                      <th style={{ padding: "var(--fhis-space-2)" }}>Type</th>
                      <th style={{ padding: "var(--fhis-space-2)" }}>Priority</th>
                      <th style={{ padding: "var(--fhis-space-2)" }}>Status</th>
                      <th style={{ padding: "var(--fhis-space-2)" }}>Dependencies</th>
                      <th style={{ padding: "var(--fhis-space-2)" }}>Source event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.tasks.map((task) => (
                      <TaskRow key={task.id} task={task} tasksById={tasksById} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Stack>
        </Panel>
      </Stack>
    </Container>
  );
}
