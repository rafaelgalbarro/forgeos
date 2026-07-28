/** PROGRAM 6030 — In-memory dry-run / node executor. */

import type { CapabilityResult } from "../../domain/capabilities";
import type { KernelPorts } from "../ports/types";
import type { MissionExecutionPlan, WorkflowNode } from "../types";
import { forceDryCapability } from "./execution-modes";
import { emit } from "../ports/event-bus-port";

export interface NodeExecutionResult {
  node: WorkflowNode;
  result?: CapabilityResult;
  blocked?: boolean;
  awaitingApproval?: boolean;
}

export async function executeNode(
  plan: MissionExecutionPlan,
  node: WorkflowNode,
  ports: KernelPorts,
  cancelled: () => boolean,
): Promise<NodeExecutionResult> {
  if (cancelled()) {
    return {
      node: { ...node, status: "cancelled", finishedAt: new Date().toISOString() },
    };
  }

  if (node.status === "awaiting_approval") {
    return { node, awaitingApproval: true };
  }
  if (node.status === "blocked") {
    return { node, blocked: true };
  }

  emit(ports.events, "NODE_STARTED", plan.missionId, {
    nodeId: node.nodeId,
    type: node.type,
    capability: node.capability,
  });

  ports.parallelism.reserve(node.nodeId);

  try {
    const { taskId } = await ports.scheduler.scheduleNode(plan.missionId, node);
    const dry = forceDryCapability(plan.executionMode) || plan.executionMode === "DRY_RUN";

    let result: CapabilityResult | undefined;

    if (node.capability) {
      result = await ports.runtime.executeScheduled(taskId, () =>
        ports.capabilities.resolve({
          capability: node.capability!,
          missionId: plan.missionId,
          nodeId: node.nodeId,
          inputs: { inputReferences: node.inputReferences },
          dryRun: dry,
        }),
      );
    } else {
      // Planning / approve / release nodes without capability adapters
      result = {
        capability: "GenerateMarketResearch",
        ok: true,
        artifactRefs: [`logical:${node.nodeId}`],
        outputs: { logical: true, nodeType: node.type },
        warnings: dry ? ["DRY_RUN logical node"] : [],
        usedFixture: dry,
      };
    }

    if (cancelled()) {
      return {
        node: { ...node, status: "cancelled", finishedAt: new Date().toISOString() },
        result,
      };
    }

    if (!result.ok) {
      const failed: WorkflowNode = {
        ...node,
        status: "failed",
        progress: node.progress,
        attempt: node.attempt + 1,
        error: result.error ?? "Capability failed",
        finishedAt: new Date().toISOString(),
      };
      emit(ports.events, "NODE_FAILED", plan.missionId, {
        nodeId: node.nodeId,
        error: failed.error,
      });
      return { node: failed, result };
    }

    const completed: WorkflowNode = {
      ...node,
      status: "completed",
      progress: 1,
      attempt: node.attempt + 1,
      artifactRefs: result.artifactRefs,
      finishedAt: new Date().toISOString(),
      startedAt: node.startedAt ?? new Date().toISOString(),
    };
    emit(ports.events, "NODE_COMPLETED", plan.missionId, {
      nodeId: node.nodeId,
      artifactRefs: completed.artifactRefs,
    });
    return { node: completed, result };
  } finally {
    ports.parallelism.release(node.nodeId);
  }
}
