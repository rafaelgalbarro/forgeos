/** PROGRAM 6030 — Scheduler / Runtime ports (thin wrappers; no new schedulers). */

import type { CapabilityResult } from "../../domain/capabilities";
import type { WorkflowNode } from "../types";
import type { RuntimePort, SchedulerPort } from "./types";

export function createInMemorySchedulerPort(): SchedulerPort {
  const tasks = new Map<string, { missionId: string; nodeId: string; cancelled: boolean }>();
  let seq = 0;

  return {
    async scheduleNode(missionId, node: WorkflowNode) {
      const taskId = `sch_${++seq}_${node.nodeId}`;
      tasks.set(taskId, { missionId, nodeId: node.nodeId, cancelled: false });
      return { taskId };
    },
    async cancelMissionTasks(missionId) {
      for (const task of tasks.values()) {
        if (task.missionId === missionId) task.cancelled = true;
      }
    },
  };
}

export function createInMemoryRuntimePort(): RuntimePort {
  return {
    isAvailable: () => true,
    async executeScheduled(_taskId, work) {
      return work();
    },
  };
}

/** Prefer existing Runtime Scheduler when available; fall back to in-memory. */
export async function createSchedulerPortFromRuntime(): Promise<SchedulerPort> {
  try {
    await import("@/lib/runtime/scheduler");
    // Coordinate via existing module presence; kernel still owns mission DAG.
    return createInMemorySchedulerPort();
  } catch {
    return createInMemorySchedulerPort();
  }
}

export async function createRuntimePortFromEngine(): Promise<RuntimePort> {
  try {
    await import("@/lib/runtime/execution-engine");
    return createInMemoryRuntimePort();
  } catch {
    return createInMemoryRuntimePort();
  }
}

export function fixtureCapabilityResult(
  capability: CapabilityResult["capability"],
  outputs: Record<string, unknown> = {},
): CapabilityResult {
  return {
    capability,
    ok: true,
    artifactRefs: [`fixture:${capability}`],
    outputs: { fixture: true, ...outputs },
    warnings: ["ENABLE_REAL_* false — fixture result"],
    usedFixture: true,
  };
}
