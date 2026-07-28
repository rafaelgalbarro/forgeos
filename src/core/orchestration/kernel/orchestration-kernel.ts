/** PROGRAM 6030 — Orchestration Kernel V2 (coordinates; does not replace Runtime/Scheduler). */

import type { ApplicationCommand, CommandResult } from "../../application/kernel-commands";
import type { KernelEvent } from "../ports/kernel-events";
import { areNodeDependenciesSatisfied } from "../dependencies/dependency-resolver";
import {
  proposeOutputSelection,
  approveOutputSelection,
  type SelectOutputsInput,
} from "../coordination/output-selection";
import { selectParallelBatch, createParallelismController } from "../coordination/parallelism";
import { computeProgress } from "../coordination/progress";
import { executeNode } from "../execution/node-executor";
import { shouldAutoAdvance } from "../execution/execution-modes";
import { buildCanonicalMissionPlan } from "../planning/mission-execution-plan";
import {
  applyApprovalBlocks,
  autoApproveForDryRun,
  grantApproval,
  denyApproval,
} from "../policies/approval-gates";
import { recomputePlanEstimates } from "../policies/cost-estimation";
import { emit } from "../ports/event-bus-port";
import {
  createCapabilityResolverV2,
  createInMemoryEventBusPort,
  createInMemoryRuntimePort,
  createInMemorySchedulerPort,
} from "../ports";
import type { KernelPorts } from "../ports/types";
import { applyRecovery, type RecoveryRequest } from "../recovery/recovery-actions";
import { buildMissionExecutionSnapshot } from "../snapshots/snapshot-builder";
import type { MissionExecutionSnapshot } from "../snapshots/types";
import type {
  ConcurrencyLimits,
  ExecutionMode,
  MissionExecutionPlan,
  MissionKernelStatus,
  OutputSelectionDecision,
  WorkflowNode,
} from "../types";
import { getReadyNodes, syncStageStatuses } from "../workflow/workflow-graph";
import { validateWorkflowDag } from "../workflow/dag-validator";

export interface CreateMissionInput {
  missionId: string;
  objective: string;
  ideaText?: string;
  executionMode?: ExecutionMode;
  includeMobile?: boolean;
}

export interface OrchestrationKernel {
  createMission(input: CreateMissionInput): MissionExecutionPlan;
  getPlan(missionId: string): MissionExecutionPlan | undefined;
  getStatus(missionId: string): MissionKernelStatus | undefined;
  selectOutputs(missionId: string, ideaText?: string): OutputSelectionDecision;
  approveOutputs(missionId: string): OutputSelectionDecision;
  approvePlan(missionId: string, approvedBy?: string): MissionExecutionPlan;
  grantNodeApproval(missionId: string, approvalId: string, by?: string): MissionExecutionPlan;
  denyNodeApproval(missionId: string, approvalId: string, by?: string): MissionExecutionPlan;
  start(missionId: string): Promise<MissionExecutionPlan>;
  tick(missionId: string): Promise<MissionExecutionPlan>;
  runToCompletion(missionId: string, maxTicks?: number): Promise<MissionExecutionPlan>;
  pause(missionId: string): MissionExecutionPlan;
  resume(missionId: string): Promise<MissionExecutionPlan>;
  cancel(missionId: string): Promise<MissionExecutionPlan>;
  recover(missionId: string, request: RecoveryRequest): MissionExecutionPlan;
  snapshot(missionId: string): MissionExecutionSnapshot | undefined;
  getEvents(missionId: string): KernelEvent[];
  dispatchCommand(command: ApplicationCommand): Promise<CommandResult>;
  /** Test helper: mark a node failed without full mission restart. */
  failNode(missionId: string, nodeId: string, error: string): MissionExecutionPlan;
}

interface MissionState {
  plan: MissionExecutionPlan;
  status: MissionKernelStatus;
  outputSelection?: OutputSelectionDecision;
  cancelled: boolean;
}

export interface CreateKernelOptions {
  ports?: Partial<KernelPorts>;
}

export function createOrchestrationKernel(options: CreateKernelOptions = {}): OrchestrationKernel {
  const missions = new Map<string, MissionState>();

  const defaultLimits: ConcurrencyLimits = {
    maxConcurrency: 3,
    maxWorkspaceCount: 2,
    maxProviderCalls: 50,
    maxEstimatedCostAmount: 100,
  };

  const ports: KernelPorts = {
    events: options.ports?.events ?? createInMemoryEventBusPort(),
    scheduler: options.ports?.scheduler ?? createInMemorySchedulerPort(),
    runtime: options.ports?.runtime ?? createInMemoryRuntimePort(),
    capabilities: options.ports?.capabilities ?? createCapabilityResolverV2(),
    parallelism: options.ports?.parallelism ?? createParallelismController(defaultLimits),
  };

  function requireMission(missionId: string): MissionState {
    const m = missions.get(missionId);
    if (!m) throw new Error(`Unknown mission ${missionId}`);
    return m;
  }

  function save(state: MissionState): MissionExecutionPlan {
    state.plan = {
      ...state.plan,
      stages: syncStageStatuses(state.plan.stages, state.plan.nodes),
      updatedAt: new Date().toISOString(),
    };
    missions.set(state.plan.missionId, state);
    return state.plan;
  }

  function markReady(plan: MissionExecutionPlan): MissionExecutionPlan {
    const statusById = new Map(plan.nodes.map((n) => [n.nodeId, n.status]));
    const nodes = plan.nodes.map((n) => {
      if (n.status !== "pending" && n.status !== "ready" && n.status !== "blocked") return n;
      if (n.status === "blocked" && n.error === "Upstream approval missing") {
        // re-evaluate below
      }
      if (areNodeDependenciesSatisfied(n, statusById)) {
        if (n.status === "blocked" && n.error === "Upstream approval missing") {
          return { ...n, status: "ready" as const, error: undefined };
        }
        if (n.status === "pending" || n.status === "ready") {
          return { ...n, status: "ready" as const };
        }
      }
      return n;
    });
    return applyApprovalBlocks({ ...plan, nodes });
  }

  const api: OrchestrationKernel = {
    createMission(input) {
      const selection = proposeOutputSelection({
        missionId: input.missionId,
        ideaText: input.ideaText ?? input.objective,
        includeMobile: input.includeMobile,
      });
      let plan = buildCanonicalMissionPlan({
        missionId: input.missionId,
        objective: input.objective,
        executionMode: input.executionMode ?? "DRY_RUN",
        outputs: selection.items,
      });
      plan = recomputePlanEstimates(plan);
      const validation = validateWorkflowDag(plan.nodes, plan.stages);
      if (!validation.ok) {
        throw new Error(`Invalid plan DAG: ${validation.issues.map((i) => i.message).join("; ")}`);
      }

      const state: MissionState = {
        plan,
        status: "created",
        outputSelection: selection,
        cancelled: false,
      };
      missions.set(input.missionId, state);
      emit(ports.events, "MISSION_CREATED", input.missionId, {
        planId: plan.planId,
        objective: plan.objective,
        mode: plan.executionMode,
      });
      emit(ports.events, "PLAN_CREATED", input.missionId, { planId: plan.planId, version: plan.version });
      emit(ports.events, "OUTPUT_SELECTION_PROPOSED", input.missionId, {
        decisionId: selection.decisionId,
        items: selection.items.map((i) => ({ kind: i.kind, requirement: i.requirement })),
      });
      return plan;
    },

    getPlan(missionId) {
      return missions.get(missionId)?.plan;
    },

    getStatus(missionId) {
      return missions.get(missionId)?.status;
    },

    selectOutputs(missionId, ideaText) {
      const state = requireMission(missionId);
      const selection = proposeOutputSelection({
        missionId,
        ideaText: ideaText ?? state.plan.objective,
      } satisfies SelectOutputsInput);
      state.outputSelection = selection;
      // Rebuild plan if mobile inclusion changed
      const rebuilt = buildCanonicalMissionPlan({
        missionId,
        objective: state.plan.objective,
        executionMode: state.plan.executionMode,
        outputs: selection.items,
      });
      state.plan = recomputePlanEstimates({
        ...rebuilt,
        planId: state.plan.planId,
        version: state.plan.version + 1,
      });
      state.status = "planning";
      emit(ports.events, "OUTPUT_SELECTION_PROPOSED", missionId, {
        decisionId: selection.decisionId,
      });
      save(state);
      return selection;
    },

    approveOutputs(missionId) {
      const state = requireMission(missionId);
      if (!state.outputSelection) {
        state.outputSelection = proposeOutputSelection({
          missionId,
          ideaText: state.plan.objective,
        });
      }
      state.outputSelection = approveOutputSelection(state.outputSelection);
      // Complete select node if present
      state.plan = {
        ...state.plan,
        nodes: state.plan.nodes.map((n) =>
          n.nodeId === "n_select_outputs"
            ? { ...n, status: "completed", progress: 1 }
            : n,
        ),
        status: "pending_approval",
      };
      state.status = "awaiting_approval";
      emit(ports.events, "OUTPUT_SELECTION_APPROVED", missionId, {
        decisionId: state.outputSelection.decisionId,
      });
      save(state);
      return state.outputSelection;
    },

    approvePlan(missionId, approvedBy = "operator") {
      const state = requireMission(missionId);
      let plan = autoApproveForDryRun(state.plan);
      for (const ap of plan.approvals.filter((a) => a.nodeId === "n_approve_plan" && a.status === "pending")) {
        plan = grantApproval(plan, ap.approvalId, approvedBy, "Plan approved");
      }
      plan = {
        ...plan,
        status: "approved",
        nodes: plan.nodes.map((n) => {
          if (n.nodeId === "n_understand" || n.nodeId === "n_select_outputs" || n.nodeId === "n_approve_plan") {
            return { ...n, status: "completed", progress: 1 };
          }
          return n;
        }),
      };
      plan = markReady(plan);
      state.plan = plan;
      state.status = "awaiting_approval";
      emit(ports.events, "PLAN_APPROVED", missionId, { planId: plan.planId, approvedBy });
      emit(ports.events, "APPROVAL_GRANTED", missionId, { scope: "plan", approvedBy });
      save(state);
      return plan;
    },

    grantNodeApproval(missionId, approvalId, by = "operator") {
      const state = requireMission(missionId);
      state.plan = markReady(grantApproval(state.plan, approvalId, by));
      emit(ports.events, "APPROVAL_GRANTED", missionId, { approvalId, by });
      return save(state);
    },

    denyNodeApproval(missionId, approvalId, by = "operator") {
      const state = requireMission(missionId);
      state.plan = applyApprovalBlocks(denyApproval(state.plan, approvalId, by));
      emit(ports.events, "APPROVAL_DENIED", missionId, { approvalId, by });
      return save(state);
    },

    async start(missionId) {
      const state = requireMission(missionId);
      // Auto-approve only in non-interactive modes; MANUAL/ASSISTED require explicit approvals.
      if (
        (state.plan.executionMode === "DRY_RUN" || state.plan.executionMode === "PREVIEW_ONLY" || state.plan.executionMode === "AUTOPILOT") &&
        (state.plan.status === "draft" || state.plan.status === "pending_approval")
      ) {
        api.approveOutputs(missionId);
        api.approvePlan(missionId);
      }
      if (state.plan.status === "draft" || state.plan.status === "pending_approval") {
        throw new Error("Plan requires output selection and plan approval before start");
      }
      state.cancelled = false;
      state.plan = markReady({ ...state.plan, status: "executing" });
      state.status = "running";
      emit(ports.events, "MISSION_STARTED", missionId, {
        planId: state.plan.planId,
        mode: state.plan.executionMode,
      });
      save(state);
      if (shouldAutoAdvance(state.plan.executionMode) && state.plan.executionMode !== "ASSISTED") {
        return api.runToCompletion(missionId);
      }
      return state.plan;
    },

    async tick(missionId) {
      const state = requireMission(missionId);
      if (state.status === "paused") return state.plan;
      if (state.status === "cancelled" || state.cancelled) return state.plan;
      if (state.status !== "running" && state.plan.status !== "executing") {
        return state.plan;
      }

      state.plan = markReady(state.plan);
      const runnable = getReadyNodes(state.plan.nodes).filter((n) => n.status === "ready");
      const limits: ConcurrencyLimits = {
        maxConcurrency: state.plan.policies.maxConcurrency,
        maxWorkspaceCount: state.plan.policies.maxWorkspaceCount,
        maxProviderCalls: state.plan.policies.maxProviderCalls,
        maxEstimatedCostAmount: state.plan.policies.maxEstimatedCost.amount,
      };

      const batchIds = state.plan.policies.allowParallelism
        ? selectParallelBatch(
            runnable.map((n) => n.nodeId),
            limits,
            ports.parallelism,
          )
        : runnable.slice(0, 1).map((n) => n.nodeId);

      if (!batchIds.length) {
        // Check awaiting approvals
        if (state.plan.nodes.some((n) => n.status === "awaiting_approval")) {
          state.status = "awaiting_approval";
          return save(state);
        }
        const allDone = state.plan.nodes.every(
          (n) =>
            n.status === "completed" ||
            n.status === "skipped" ||
            n.status === "cancelled",
        );
        const anyFailed = state.plan.nodes.some((n) => n.status === "failed");
        if (allDone) {
          state.plan = { ...state.plan, status: "completed" };
          state.status = "completed";
          emit(ports.events, "MISSION_COMPLETED", missionId, {
            progress: computeProgress(state.plan),
          });
        } else if (anyFailed && !runnable.length) {
          state.plan = { ...state.plan, status: "failed" };
          state.status = "failed";
          emit(ports.events, "MISSION_FAILED", missionId, {
            failedNodes: state.plan.nodes.filter((n) => n.status === "failed").map((n) => n.nodeId),
          });
        }
        return save(state);
      }

      const batch = batchIds
        .map((id) => state.plan.nodes.find((n) => n.nodeId === id)!)
        .filter(Boolean);

      // Mark running
      state.plan = {
        ...state.plan,
        nodes: state.plan.nodes.map((n) =>
          batchIds.includes(n.nodeId)
            ? { ...n, status: "running" as const, startedAt: new Date().toISOString() }
            : n,
        ),
      };

      const results = await Promise.all(
        batch.map((n) =>
          executeNode(state.plan, { ...n, status: "running" }, ports, () => state.cancelled),
        ),
      );

      const byId = new Map(results.map((r) => [r.node.nodeId, r.node]));
      state.plan = {
        ...state.plan,
        nodes: state.plan.nodes.map((n) => byId.get(n.nodeId) ?? n),
      };

      // Isolated failure: do not cascade-cancel whole mission
      const failed = results.filter((r) => r.node.status === "failed");
      if (failed.length) {
        emit(ports.events, "NODE_FAILED", missionId, {
          nodeIds: failed.map((f) => f.node.nodeId),
          isolated: true,
        });
      }

      state.plan = markReady(state.plan);
      return save(state);
    },

    async runToCompletion(missionId, maxTicks = 50) {
      const state = requireMission(missionId);
      if (state.status !== "running") {
        state.status = "running";
        state.plan = { ...state.plan, status: "executing" };
      }
      for (let i = 0; i < maxTicks; i++) {
        await api.tick(missionId);
        const s = requireMission(missionId);
        if (
          s.status === "completed" ||
          s.status === "failed" ||
          s.status === "cancelled" ||
          s.status === "paused" ||
          s.status === "awaiting_approval"
        ) {
          break;
        }
        // No progress possible
        const ready = getReadyNodes(s.plan.nodes);
        if (!ready.length && !s.plan.nodes.some((n) => n.status === "running")) {
          await api.tick(missionId);
          break;
        }
      }
      return requireMission(missionId).plan;
    },

    pause(missionId) {
      const state = requireMission(missionId);
      const result = applyRecovery(state.plan, { action: "pause" });
      state.plan = result.plan;
      state.status = "paused";
      emit(ports.events, "MISSION_PAUSED", missionId, {});
      emit(ports.events, "RECOVERY_APPLIED", missionId, { action: "pause" });
      return save(state);
    },

    async resume(missionId) {
      const state = requireMission(missionId);
      const result = applyRecovery(state.plan, { action: "resume" });
      state.plan = markReady(result.plan);
      state.status = "running";
      state.cancelled = false;
      emit(ports.events, "MISSION_RESUMED", missionId, {});
      emit(ports.events, "RECOVERY_APPLIED", missionId, { action: "resume" });
      save(state);
      if (shouldAutoAdvance(state.plan.executionMode)) {
        return api.runToCompletion(missionId);
      }
      return state.plan;
    },

    async cancel(missionId) {
      const state = requireMission(missionId);
      state.cancelled = true;
      if (state.plan.policies.cancellationPropagates) {
        ports.parallelism.cancelAll();
        await ports.scheduler.cancelMissionTasks(missionId);
      }
      const result = applyRecovery(state.plan, { action: "cancel" });
      state.plan = result.plan;
      state.status = "cancelled";
      emit(ports.events, "MISSION_CANCELLED", missionId, {});
      emit(ports.events, "RECOVERY_APPLIED", missionId, { action: "cancel" });
      return save(state);
    },

    recover(missionId, request) {
      const state = requireMission(missionId);
      const result = applyRecovery(state.plan, request);
      if (!result.ok) throw new Error(result.message);
      state.plan = markReady(result.plan);
      if (request.action === "pause" || request.action === "human_intervention") {
        state.status = "paused";
      } else if (request.action === "cancel") {
        state.status = "cancelled";
        state.cancelled = true;
      } else if (request.action === "resume" || request.action === "retry" || request.action === "retry_with_change" || request.action === "logical_rollback" || request.action === "repair_plan") {
        state.status = "running";
        state.cancelled = false;
      }
      emit(ports.events, "RECOVERY_APPLIED", missionId, {
        action: request.action,
        nodeId: request.nodeId,
        message: result.message,
      });
      return save(state);
    },

    snapshot(missionId) {
      const state = missions.get(missionId);
      if (!state) return undefined;
      const snap = buildMissionExecutionSnapshot(
        state.plan,
        state.status,
        ports.events.getHistory(100).filter((e) => e.missionId === missionId),
      );
      emit(ports.events, "SNAPSHOT_TAKEN", missionId, {
        progress: snap.progress.mission,
      });
      return snap;
    },

    getEvents(missionId) {
      return ports.events.getHistory(200).filter((e) => e.missionId === missionId);
    },

    failNode(missionId, nodeId, error) {
      const state = requireMission(missionId);
      state.plan = {
        ...state.plan,
        nodes: state.plan.nodes.map((n) =>
          n.nodeId === nodeId
            ? { ...n, status: "failed" as const, error, finishedAt: new Date().toISOString() }
            : n,
        ),
      };
      emit(ports.events, "NODE_FAILED", missionId, { nodeId, error, isolated: true });
      return save(state);
    },

    async dispatchCommand(command): Promise<CommandResult> {
      const { missionId, name } = command;
      try {
        switch (name) {
          case "StartMission":
            await api.start(missionId);
            break;
          case "ApprovePlan":
            api.approvePlan(missionId, command.requestedBy);
            break;
          case "SelectOutputs":
            api.selectOutputs(missionId, String(command.payload?.ideaText ?? ""));
            api.approveOutputs(missionId);
            break;
          case "StartBuild":
          case "CreatePreview":
          case "CreateRelease":
          case "DeployPreview":
            // Natural wiring: ensure mission running; capabilities resolve via adapters.
            if (api.getStatus(missionId) !== "running") {
              await api.start(missionId);
            } else {
              await api.tick(missionId);
            }
            break;
          case "PauseMission":
            api.pause(missionId);
            break;
          case "ResumeMission":
            await api.resume(missionId);
            break;
          case "CancelMission":
            await api.cancel(missionId);
            break;
          default:
            return {
              ok: false,
              command: name,
              missionId,
              message: `Unsupported command ${name}`,
            };
        }
        return {
          ok: true,
          command: name,
          missionId,
          message: `Command ${name} applied`,
          data: { status: api.getStatus(missionId), progress: computeProgress(api.getPlan(missionId)!) },
        };
      } catch (err) {
        return {
          ok: false,
          command: name,
          missionId,
          message: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };

  return api;
}

export type { WorkflowNode };
