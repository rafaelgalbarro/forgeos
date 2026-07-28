"use client";

import { useState } from "react";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Progress } from "@/components/ui/fhis/Progress";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import type { LiveMissionState } from "@/lib/mission-control/live-mission/types";
import type { LiveMissionSerializableSnapshot } from "@/lib/live-mission/types";
import {
  selectQueuedTasks,
  selectRunningTasks,
  selectFailedTasks,
  selectAllDepartments,
  selectArtifactFeed,
  selectErrorsAndWarnings,
  selectEtaSeconds,
  selectMissionState,
  formatEta,
  visibleStateLabel,
  visibleStateBadgeVariant,
} from "@/lib/live-mission/live-mission-selector";
import { formatLogTime } from "@/lib/mission-control/live-mission/mission-logs";
import { phaseLabelEs } from "@/lib/mission-control/mission-flow";
import { retryFailedTask } from "@/lib/live-mission/live-mission-store";

interface Props {
  liveMission: LiveMissionState;
  snapshot?: LiveMissionSerializableSnapshot | null;
  missionId?: string;
  onRetry?: () => void;
}

type FeedTab = "research" | "build" | "deployment" | "artifacts";

export function MissionActivityPanel({ liveMission, snapshot, missionId, onRetry }: Props) {
  const [feedTab, setFeedTab] = useState<FeedTab>("research");

  const queued = snapshot ? selectQueuedTasks(snapshot) : [];
  const running = snapshot ? selectRunningTasks(snapshot) : [];
  const failed = snapshot ? selectFailedTasks(snapshot) : [];
  const departments = snapshot ? selectAllDepartments(snapshot) : [];
  const artifacts = snapshot ? selectArtifactFeed(snapshot) : [];
  const warnings = snapshot ? selectErrorsAndWarnings(snapshot) : [];
  const eta = snapshot ? selectEtaSeconds(snapshot) : 0;
  const missionState = snapshot ? selectMissionState(snapshot) : null;

  const feedItems =
    feedTab === "research"
      ? liveMission.researchFeed
      : feedTab === "build"
        ? liveMission.buildFeed
        : feedTab === "deployment"
          ? liveMission.deploymentFeed
          : [];

  const handleRetry = (taskId: string) => {
    if (!missionId) return;
    retryFailedTask(missionId, taskId);
    onRetry?.();
  };

  return (
    <Panel className="fhis-mc-activity-panel" style={{ height: "100%" }}>
      <Stack gap="md">
        <SectionHeader title="Mission Activity" subtitle="Actividad en vivo" />

        {missionState && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Badge variant={visibleStateBadgeVariant(missionState)}>{visibleStateLabel(missionState)}</Badge>
            {eta > 0 && (
              <span style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>
                ETA {formatEta(eta)}
              </span>
            )}
          </div>
        )}

        <div>
          <div style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)", marginBottom: 4 }}>
            Progreso — {phaseLabelEs(liveMission.progressPhase)}
          </div>
          <Progress value={liveMission.progressPercent} max={100} />
          <div style={{ fontSize: "0.75rem", textAlign: "right", marginTop: 2 }}>
            {liveMission.progressPercent}%
          </div>
        </div>

        <div>
          <SectionHeader title="Queue Status" subtitle="Cola de tareas" />
          {running.length === 0 && queued.length === 0 && failed.length === 0 && liveMission.tasks.length === 0 ? (
            <p style={{ fontSize: "0.8125rem", color: "var(--fhis-color-text-muted)" }}>Sin tareas en cola</p>
          ) : (
            <>
              {running.map((t) => (
                <TaskRow key={t.id} label={t.label} state={t.state} progress={t.progress} />
              ))}
              {queued.map((t) => (
                <TaskRow key={t.id} label={t.label} state={t.state} />
              ))}
              {failed.map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                  <TaskRow label={t.label} state={t.state} error={t.errorMessage} />
                  {missionId && (
                    <Button variant="ghost" onClick={() => handleRetry(t.id)} style={{ fontSize: "0.75rem", padding: "2px 8px" }}>
                      Reintentar
                    </Button>
                  )}
                </div>
              ))}
              {!snapshot &&
                liveMission.tasks.slice(0, 8).map((t) => (
                  <TaskRow key={t.id} label={t.label} state={t.status === "Completed" ? "COMPLETED" : t.status === "Running" ? "RUNNING" : t.status === "Failed" ? "FAILED" : "QUEUED"} />
                ))}
            </>
          )}
        </div>

        <div>
          <SectionHeader title="Department Status" subtitle="Departamentos" />
          <div style={{ display: "grid", gap: 6 }}>
            {(departments.length ? departments : liveMission.departmentActivity).map((d) => (
              <div key={d.department} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8125rem" }}>
                <DeptDot state={"state" in d ? d.state : deptStatusToState(d.status)} />
                <span style={{ fontWeight: 500, minWidth: 64 }}>{d.department}</span>
                <span style={{ color: "var(--fhis-color-text-muted)", flex: 1 }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {warnings.length > 0 && (
          <div>
            <SectionHeader title="Errors & Warnings" subtitle="Alertas" />
            <div style={{ maxHeight: 100, overflowY: "auto" }}>
              {warnings.map((w) => (
                <div
                  key={w.id}
                  style={{
                    fontSize: "0.75rem",
                    padding: "4px 0",
                    color: w.level === "error" ? "#ef4444" : "#f59e0b",
                  }}
                >
                  {w.level === "error" ? "⛔" : "⚠️"} {w.message}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
            {(["research", "build", "deployment", "artifacts"] as FeedTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFeedTab(tab)}
                style={{
                  fontSize: "0.75rem",
                  padding: "4px 8px",
                  borderRadius: 4,
                  border: "1px solid var(--fhis-color-border)",
                  background: feedTab === tab ? "var(--fhis-color-accent-muted, #e0e7ff)" : "transparent",
                  cursor: "pointer",
                }}
              >
                {tab === "research" ? "Research" : tab === "build" ? "Build" : tab === "deployment" ? "Deploy" : "Artifacts"}
              </button>
            ))}
          </div>
          {feedTab === "artifacts" ? (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: 120, overflowY: "auto" }}>
              {artifacts.length === 0 ? (
                <li style={{ fontSize: "0.8125rem", color: "var(--fhis-color-text-muted)" }}>Sin artefactos</li>
              ) : (
                artifacts.map((a) => (
                  <li key={a.id} style={{ fontSize: "0.75rem", padding: "4px 0", borderBottom: "1px solid var(--fhis-color-border)" }}>
                    📄 {a.label}
                    {a.summary && <span style={{ color: "var(--fhis-color-text-muted)", marginLeft: 6 }}>— {a.summary}</span>}
                  </li>
                ))
              )}
            </ul>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: 120, overflowY: "auto" }}>
              {feedItems.length === 0 ? (
                <li style={{ fontSize: "0.8125rem", color: "var(--fhis-color-text-muted)" }}>Sin eventos</li>
              ) : (
                feedItems.slice(0, 6).map((item) => (
                  <li key={item.id} style={{ fontSize: "0.75rem", padding: "4px 0", borderBottom: "1px solid var(--fhis-color-border)" }}>
                    <span style={{ color: "var(--fhis-color-text-muted)", marginRight: 6 }}>{item.timestamp}</span>
                    {item.label}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        <div>
          <SectionHeader title="Mission Logs" subtitle="Últimos eventos" />
          <div style={{ maxHeight: 140, overflowY: "auto", fontSize: "0.75rem", fontFamily: "monospace" }}>
            {liveMission.logs.length === 0 ? (
              <p style={{ color: "var(--fhis-color-text-muted)" }}>Sin logs</p>
            ) : (
              liveMission.logs.slice(0, 12).map((log) => (
                <div key={log.id} style={{ padding: "2px 0", color: log.level === "warn" ? "#f59e0b" : log.level === "error" ? "#ef4444" : undefined }}>
                  [{formatLogTime(log.timestamp)}] {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      </Stack>
    </Panel>
  );
}

function deptStatusToState(status: string): import("@/lib/live-mission/types").LiveMissionVisibleState {
  if (status === "active") return "RUNNING";
  if (status === "waiting") return "WAITING";
  if (status === "done") return "COMPLETED";
  return "QUEUED";
}

function DeptDot({ state }: { state: import("@/lib/live-mission/types").LiveMissionVisibleState }) {
  const colors: Record<string, string> = {
    RUNNING: "var(--fhis-color-accent)",
    WAITING: "var(--fhis-color-amber, #f59e0b)",
    COMPLETED: "var(--fhis-color-success, #22c55e)",
    FAILED: "#ef4444",
    BLOCKED: "#ef4444",
    PAUSED: "var(--fhis-color-text-muted)",
    QUEUED: "var(--fhis-color-text-muted)",
  };
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: colors[state] ?? "var(--fhis-color-text-muted)",
        flexShrink: 0,
      }}
    />
  );
}

function TaskRow({
  label,
  state,
  progress,
  error,
}: {
  label: string;
  state: import("@/lib/live-mission/types").LiveMissionVisibleState;
  progress?: number;
  error?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "6px 0",
        borderBottom: "1px solid var(--fhis-color-border)",
        fontSize: "0.8125rem",
        flex: 1,
      }}
    >
      <span style={{ flex: 1 }}>
        {label}
        {error && <span style={{ display: "block", color: "#ef4444", fontSize: "0.7rem" }}>{error}</span>}
        {progress !== undefined && progress > 0 && progress < 100 && (
          <span style={{ color: "var(--fhis-color-text-muted)", marginLeft: 6 }}>{progress}%</span>
        )}
      </span>
      <Badge variant={visibleStateBadgeVariant(state)}>{visibleStateLabel(state)}</Badge>
    </div>
  );
}
