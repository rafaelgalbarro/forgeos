/** ForgeOS Worker Runtime — mock task runner (Epic 4.3). */

import {
  computeHealthLevel,
  recordExecutionFailure,
  recordExecutionSuccess,
  createInitialHealthMetrics,
  type WorkerHealthMetrics,
} from "./health";
import { toHealthSnapshot, updateWorkerStatus } from "./worker";
import {
  publishWorkerBlocked,
  publishWorkerCompleted,
  publishWorkerFailed,
  publishWorkerHealthChanged,
  publishWorkerStarted,
} from "./eventbus-adapter";
import { checkSchedulerEligibility } from "./scheduler-adapter";
import { checkStateMachineEligibility, getVentureState } from "./state-machine-adapter";
import type { WorkerRuntimeContext } from "./worker-context";
import type { WorkerTaskRequest, WorkerTaskResult } from "./types";
import { getStatusTransitionHistory } from "./worker-status";
import type { createWorkerRegistry } from "./worker-registry";

export interface WorkerRunnerValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface WorkerRunner {
  validate(request: WorkerTaskRequest): WorkerRunnerValidation;
  run(request: WorkerTaskRequest): WorkerTaskResult;
  getTransitionHistory(): ReturnType<typeof getStatusTransitionHistory>;
}

type MutableRegistry = ReturnType<typeof createWorkerRegistry>;

const healthMetricsByWorker = new Map<string, WorkerHealthMetrics>();

function getOrCreateMetrics(workerId: string): WorkerHealthMetrics {
  let m = healthMetricsByWorker.get(workerId);
  if (!m) {
    m = createInitialHealthMetrics();
    healthMetricsByWorker.set(workerId, m);
  }
  return m;
}

function applyHealth(
  registry: MutableRegistry,
  workerId: string,
  metrics: WorkerHealthMetrics,
  ctx: WorkerRuntimeContext,
  reason: string,
): void {
  const worker = registry.find(workerId);
  if (!worker) return;
  const prevLevel = worker.health.level;
  const snapshot = toHealthSnapshot(metrics);
  registry.update(workerId, { health: snapshot });
  const newLevel = computeHealthLevel(metrics, worker.status === "OFFLINE");
  if (prevLevel !== newLevel) {
    publishWorkerHealthChanged(ctx.eventBus, ctx.triggeredBy, {
      workerId,
      from: prevLevel,
      to: newLevel,
      reason,
    });
  }
}

function generateMockOutput(workerId: string, workerName: string, taskType: string): Record<string, unknown> {
  return {
    workerId,
    workerName,
    taskType,
    mock: true,
    summary: `[MOCK] ${workerName} completed ${taskType}`,
    artifacts: [`mock-${workerId}-${taskType}.json`],
    provider: "mock",
    model: "none",
  };
}

export function createWorkerRunner(ctx: WorkerRuntimeContext): WorkerRunner {
  const { registry, eventBus, scheduler, stateMachine, telemetry, triggeredBy } = ctx;
  const mutableRegistry = registry as MutableRegistry;

  function validate(request: WorkerTaskRequest): WorkerRunnerValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    const worker = registry.find(request.workerId);
    if (!worker) {
      errors.push(`Worker not found: ${request.workerId}`);
      return { valid: false, errors, warnings };
    }

    if (worker.status === "OFFLINE" || worker.status === "DEPRECATED") {
      errors.push(`Worker is ${worker.status}`);
    }

    if (!worker.supportedTasks.includes(request.taskType)) {
      errors.push(`Task ${request.taskType} not in supported tasks for ${worker.id}`);
    }

    const stateResult = checkStateMachineEligibility(worker, request.ventureState);
    if (!stateResult.allowed) {
      errors.push(stateResult.reason);
    }

    const liveState = getVentureState(stateMachine, request.ventureId);
    if (liveState !== request.ventureState) {
      warnings.push(`Request state ${request.ventureState} differs from machine state ${liveState}`);
    }

    const schedResult = checkSchedulerEligibility(
      scheduler,
      worker,
      request.taskType,
      request.ventureId,
    );
    if (!schedResult.eligible) {
      for (const reason of schedResult.blockedReasons) {
        warnings.push(reason);
      }
      for (const dep of schedResult.missingDependencies) {
        warnings.push(`Missing dependency: ${dep}`);
      }
    }

    for (const ctxKey of worker.requiredContext) {
      if (ctxKey === "ventureId" && !request.ventureId) {
        errors.push("Missing required context: ventureId");
      }
      if (ctxKey === "ventureState" && !request.ventureState) {
        errors.push("Missing required context: ventureState");
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  function run(request: WorkerTaskRequest): WorkerTaskResult {
    const startMs = Date.now();
    const validation = validate(request);
    const taskId = request.taskId ?? `task_${request.workerId}_${Date.now()}`;

    const worker = registry.find(request.workerId);
    if (!worker) {
      return {
        success: false,
        workerId: request.workerId,
        taskType: request.taskType,
        ventureId: request.ventureId,
        taskId,
        status: "FAILED",
        durationMs: 0,
        output: {},
        errors: [`Worker not found: ${request.workerId}`],
        warnings: [],
        mock: true,
      };
    }

    if (!validation.valid) {
      const blocked = updateWorkerStatus(worker, "BLOCKED", validation.errors.join("; "));
      mutableRegistry.update(worker.id, { status: blocked.status });

      publishWorkerBlocked(eventBus, triggeredBy, {
        workerId: worker.id,
        ventureId: request.ventureId,
        from: worker.status,
        to: "BLOCKED",
        reason: validation.errors.join("; "),
        taskType: request.taskType,
      });

      return {
        success: false,
        workerId: request.workerId,
        taskType: request.taskType,
        ventureId: request.ventureId,
        taskId,
        status: "BLOCKED",
        durationMs: Date.now() - startMs,
        output: {},
        errors: validation.errors,
        warnings: validation.warnings,
        mock: true,
      };
    }

    let current = worker;
    current = updateWorkerStatus(current, "READY", "Validation passed");
    mutableRegistry.update(current.id, { status: current.status });
    current = updateWorkerStatus(current, "RUNNING", `Executing ${request.taskType}`);
    mutableRegistry.update(current.id, { status: current.status });

    publishWorkerStarted(eventBus, triggeredBy, {
      workerId: worker.id,
      ventureId: request.ventureId,
      taskType: request.taskType,
      taskId,
    });

    const latencyMs = Date.now() - startMs;
    const mockDelay = 12 + Math.floor(Math.random() * 38);
    const durationMs = latencyMs + mockDelay;
    const output = generateMockOutput(worker.id, worker.name, request.taskType);

    const metrics = recordExecutionSuccess(getOrCreateMetrics(worker.id), durationMs);
    applyHealth(mutableRegistry, worker.id, metrics, ctx, "Successful mock execution");

    let afterRun = registry.find(worker.id)!;
    afterRun = updateWorkerStatus(afterRun, "COMPLETED", `Mock completed ${request.taskType}`);
    mutableRegistry.update(afterRun.id, { status: afterRun.status });
    afterRun = updateWorkerStatus(afterRun, "IDLE", "Ready for next task");
    mutableRegistry.update(afterRun.id, { status: afterRun.status });

    publishWorkerCompleted(eventBus, triggeredBy, {
      workerId: worker.id,
      ventureId: request.ventureId,
      taskType: request.taskType,
      taskId,
      durationMs,
      summary: String(output.summary),
    });

    telemetry.record({
      workerId: worker.id,
      taskType: request.taskType,
      ventureId: request.ventureId,
      ventureState: request.ventureState,
      workerStatus: "COMPLETED",
      latencyMs,
      durationMs,
      success: true,
      errors: [],
      warnings: validation.warnings,
      provider: "mock",
      model: "none",
      metadata: request.metadata,
    });

    return {
      success: true,
      workerId: request.workerId,
      taskType: request.taskType,
      ventureId: request.ventureId,
      taskId,
      status: "COMPLETED",
      durationMs,
      output,
      errors: [],
      warnings: validation.warnings,
      mock: true,
    };
  }

  return {
    validate,
    run,
    getTransitionHistory: getStatusTransitionHistory,
  };
}

export function clearRunnerHealthMetrics(): void {
  healthMetricsByWorker.clear();
}
