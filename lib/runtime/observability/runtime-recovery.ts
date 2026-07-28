/** Recovery plan generation — plan only, no auto-execute (Epic 4.6). */

import {
  getStoreLimits,
  nextObservabilityId,
  pushBounded,
  type ObservabilityStore,
} from "./runtime-store";
import type {
  HistoryEntry,
  RecoveryAction,
  RecoveryPlan,
  RuntimeAlert,
  RuntimeMonitorOptions,
  RuntimeObservabilityContext,
} from "./types";

function action(
  type: RecoveryAction["type"],
  target: string,
  reason: string,
  priority: RecoveryAction["priority"] = "medium",
): RecoveryAction {
  return { type, target, reason, priority, autoExecutable: false };
}

export function generateRecoveryPlan(
  ctx: RuntimeObservabilityContext,
  alerts: RuntimeAlert[],
): RecoveryPlan | null {
  if (alerts.length === 0) return null;

  const actions: RecoveryAction[] = [];
  const queueSnapshot = ctx.queue.getSnapshot(ctx.ventureId);
  const events = ctx.eventBus.getHistory(20);

  for (const alert of alerts) {
    switch (alert.type) {
      case "WORKER_OFFLINE": {
        const workerId = (alert.metadata?.workerId as string) ?? alert.message;
        actions.push(
          action("RESTART_WORKER", workerId, `Recover offline worker: ${alert.message}`, "high"),
        );
        break;
      }
      case "QUEUE_SATURATED": {
        const blocked = queueSnapshot.tasks.filter((t) => t.status === "BLOCKED");
        if (blocked.length > 0) {
          actions.push(
            action(
              "CLEAR_BLOCKED_QUEUE",
              ctx.ventureId,
              `Clear ${blocked.length} blocked task(s) to reduce saturation`,
              "high",
            ),
          );
        }
        const retryCandidates = queueSnapshot.tasks.filter(
          (t) => t.status === "FAILED" || t.status === "TIMEOUT",
        );
        for (const task of retryCandidates.slice(0, 3)) {
          actions.push(
            action("RETRY_TASK", task.id, `Retry failed task ${task.label}`, "medium"),
          );
        }
        break;
      }
      case "SCHEDULER_STOPPED": {
        const lastEvent = events[events.length - 1];
        if (lastEvent) {
          actions.push(
            action(
              "RE_EMIT_EVENT",
              lastEvent.id,
              `Re-emit ${lastEvent.type} to restart scheduler pipeline`,
              "medium",
            ),
          );
        }
        break;
      }
      case "EXECUTION_BLOCKED": {
        const running = queueSnapshot.tasks.filter((t) => t.status === "RUNNING");
        for (const task of running.slice(0, 2)) {
          actions.push(
            action(
              "RETRY_TASK",
              task.id,
              `Re-queue blocked execution for ${task.label}`,
              "high",
            ),
          );
        }
        break;
      }
      case "AI_PROVIDER_SLOW":
        actions.push(
          action(
            "RE_EMIT_EVENT",
            "ai-orchestration",
            "Re-route AI task through fallback provider chain",
            "low",
          ),
        );
        break;
      case "MEMORY_INCONSISTENT":
        actions.push(
          action(
            "CLEAN_ORPHAN_SESSION",
            ctx.ventureId,
            "Clean orphan executive memory session records",
            "medium",
          ),
        );
        break;
    }
  }

  if (actions.length === 0) return null;

  const uniqueActions = actions.filter(
    (a, i, arr) =>
      arr.findIndex((b) => b.type === a.type && b.target === a.target) === i,
  );

  return {
    id: nextObservabilityId("recovery"),
    generatedAt: new Date().toISOString(),
    ventureId: ctx.ventureId,
    triggerAlertIds: alerts.map((a) => a.id),
    actions: uniqueActions,
    summary: `${uniqueActions.length} recovery action(s) proposed (manual execution required)`,
  };
}

export function storeRecoveryPlan(
  store: ObservabilityStore,
  plan: RecoveryPlan,
  options: RuntimeMonitorOptions = {},
): RecoveryPlan {
  const limits = getStoreLimits(options);
  const historyEntry: HistoryEntry = {
    id: nextObservabilityId("hist"),
    timestamp: plan.generatedAt,
    kind: "recovery",
    summary: plan.summary,
    payload: { planId: plan.id, actionCount: plan.actions.length },
  };
  pushBounded(store.history, historyEntry, limits.history);
  return plan;
}
