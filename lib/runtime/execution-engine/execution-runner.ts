/** ForgeOS Execution Engine — single execution runner (Epic 4.5). */

import type { ExecutionEngineContext, ExecutionResult } from "./types";
import { dispatchTask } from "./task-dispatcher";
import { dispatchWorker } from "./worker-dispatcher";
import {
  createExecutionSession,
  finishSession,
  appendSessionEvent,
} from "./execution-session";
import { advancePipeline } from "./execution-pipeline";
import {
  markTaskRunning,
  markTaskCompleted,
  markTaskFailed,
} from "./queue-adapter";
import {
  executeWorkerTask,
  resolveVentureStateForExecution,
} from "./worker-adapter";
import { getSchedulerTaskCreatedAt } from "./scheduler-adapter";
import {
  publishSessionCreated,
  publishSessionFinished,
  publishExecutionStarted,
  publishExecutionFinished,
  publishExecutionFailed,
  publishWorkerDispatched,
  publishTaskExecuted,
} from "./eventbus-adapter";
import { writeExecutionMemory } from "./memory-adapter";
import { writeExecutionDecision } from "./decision-graph-adapter";
import {
  computeQueueWaitMs,
  computeSchedulerDelayMs,
} from "./execution-metrics";
import {
  resolveVentureContextFlags,
  validateWorkerForVentureState,
} from "./execution-policies";
import { validateWorkerForState } from "../workers/state-machine-adapter";

export function runSingleExecution(
  ctx: ExecutionEngineContext,
  ventureId: string,
): ExecutionResult | null {
  const { eventBus, scheduler, queue, registry, stateMachine, store, history, telemetry, aiOrchestration, triggeredBy } = ctx;
  const workers = registry.list();

  const { task, reason: taskReason } = dispatchTask(scheduler, queue, workers, ventureId);
  if (!task) return null;

  const ventureState = resolveVentureStateForExecution(stateMachine, ventureId);
  const schedulerDelayMs = computeSchedulerDelayMs(
    task.enqueuedAt,
    getSchedulerTaskCreatedAt(scheduler, task.schedulerTaskId),
  );

  const { worker, reason: workerReason, unavailable } = dispatchWorker(
    registry,
    queue,
    task,
    ventureState,
  );

  if (unavailable || !worker) {
    return {
      session: createExecutionSession({
        ventureId,
        workerId: task.recommendedWorkerId ?? "none",
        taskId: task.id,
        taskType: String(task.type),
        schedulerDelayMs,
      }),
      task,
      worker: null,
      workerResult: null,
      success: false,
      skipped: true,
      skipReason: workerReason,
    };
  }

  const startedAt = new Date().toISOString();
  const queueWaitMs = computeQueueWaitMs(task.enqueuedAt, startedAt);

  let session = createExecutionSession({
    ventureId,
    workerId: worker.id,
    taskId: task.id,
    taskType: String(task.type),
    queueWaitMs,
    schedulerDelayMs,
  });

  store.add(session);
  publishSessionCreated(eventBus, triggeredBy, session);
  publishExecutionStarted(eventBus, triggeredBy, session, "READY");

  let step = advancePipeline(session, "DISPATCHED", taskReason);
  session = step.session;
  store.update(session.sessionId, session);

  publishWorkerDispatched(eventBus, triggeredBy, {
    workerId: worker.id,
    ventureId,
    taskId: task.id,
    taskType: String(task.type),
    sessionId: session.sessionId,
    reason: workerReason,
  });

  const contextFlags = resolveVentureContextFlags(ventureId, queue);
  const policyValidation = validateWorkerForVentureState(worker, ventureState, contextFlags);
  const smValidation = validateWorkerForState(worker, stateMachine, ventureId);

  const validationErrors = [
    ...policyValidation.errors,
    ...(smValidation.allowed ? [] : [smValidation.reason]),
  ];
  const validationWarnings = [
    ...policyValidation.warnings,
  ];

  if (validationErrors.length > 0) {
    step = advancePipeline(session, "FAILED", validationErrors.join("; "));
    session = finishSession(step.session, {
      success: false,
      errors: validationErrors,
      warnings: validationWarnings,
      durationMs: Date.now() - new Date(session.startedAt).getTime(),
    });
    store.update(session.sessionId, session);
    markTaskFailed(queue, eventBus, triggeredBy, task.id, worker.id, validationErrors[0]);
    publishExecutionFailed(eventBus, triggeredBy, session, validationErrors[0]);
    publishSessionFinished(eventBus, triggeredBy, session);
    history.recordSession(session, false);
    return { session, task, worker, workerResult: null, success: false, skipped: false };
  }

  step = advancePipeline(session, "VALIDATED", "State machine guards passed");
  session = step.session;
  store.update(session.sessionId, session);

  const runningTask = markTaskRunning(queue, eventBus, triggeredBy, task.id, worker.id);
  step = advancePipeline(session, "RUNNING", "Worker executing");
  session = step.session;
  store.update(session.sessionId, session);

  const aiResult = aiOrchestration.invoke({
    ventureId,
    sessionId: session.sessionId,
    workerId: worker.id,
    taskType: String(task.type),
  });

  session = {
    ...session,
    provider: aiResult.provider,
    model: aiResult.model,
    latencyMs: aiResult.latencyMs,
    fallback: aiResult.fallback,
    warnings: [...session.warnings, ...aiResult.warnings, ...validationWarnings],
  };

  const workerResult = executeWorkerTask(
    {
      registry,
      eventBus,
      scheduler,
      stateMachine,
      ventureId,
      triggeredBy,
    },
    {
      workerId: worker.id,
      taskType: task.type,
      ventureId,
      ventureState,
      taskId: task.id,
      metadata: { sessionId: session.sessionId, aiOutput: aiResult.output },
    },
  );

  const memoryWrite = writeExecutionMemory({
    ventureId,
    sessionId: session.sessionId,
    workerId: worker.id,
    taskId: task.id,
    memoryType: "execution_result",
    summary: `[MOCK] ${worker.name} executed ${task.type}`,
  });

  const decisionWrite = writeExecutionDecision({
    ventureId,
    sessionId: session.sessionId,
    workerId: worker.id,
    taskId: task.id,
    nodeType: workerResult.success ? "Approved" : "Blocked",
    title: `${task.type} execution ${workerResult.success ? "completed" : "failed"}`,
    rationale: workerResult.success
      ? `Mock execution via ${worker.id}`
      : workerResult.errors.join("; "),
    confidence: workerResult.success ? 0.85 : 0.4,
  });

  session = appendSessionEvent(session, "memory_written", memoryWrite.id);
  session = appendSessionEvent(session, "decision_written", decisionWrite.id);

  step = advancePipeline(session, "FINISHED", "Worker run complete");
  session = step.session;

  const durationMs = workerResult.durationMs;

  if (workerResult.success) {
    step = advancePipeline(session, "COMPLETED", "Pipeline complete");
    session = finishSession(step.session, {
      success: true,
      warnings: session.warnings,
      memoryWrites: [memoryWrite],
      decisionWrites: [decisionWrite],
      provider: aiResult.provider,
      model: aiResult.model,
      latencyMs: aiResult.latencyMs,
      fallback: aiResult.fallback,
      durationMs,
    });
    markTaskCompleted(queue, eventBus, triggeredBy, task.id, worker.id, durationMs);
    publishExecutionFinished(eventBus, triggeredBy, session);
  } else {
    session = finishSession(session, {
      success: false,
      errors: workerResult.errors,
      warnings: [...session.warnings, ...workerResult.warnings],
      memoryWrites: [memoryWrite],
      decisionWrites: [decisionWrite],
      provider: aiResult.provider,
      model: aiResult.model,
      latencyMs: aiResult.latencyMs,
      fallback: aiResult.fallback,
      durationMs,
    });
    session = { ...session, pipelineState: "FAILED" };
    markTaskFailed(queue, eventBus, triggeredBy, task.id, worker.id, workerResult.errors[0] ?? "Unknown");
    publishExecutionFailed(eventBus, triggeredBy, session, workerResult.errors[0] ?? "Unknown");
  }

  store.update(session.sessionId, session);
  publishSessionFinished(eventBus, triggeredBy, session);

  publishTaskExecuted(eventBus, triggeredBy, {
    taskId: task.id,
    ventureId,
    taskType: String(task.type),
    workerId: worker.id,
    sessionId: session.sessionId,
    success: workerResult.success,
    durationMs,
    error: workerResult.errors[0],
  });

  telemetry.record({
    sessionId: session.sessionId,
    ventureId,
    workerId: worker.id,
    taskId: task.id,
    taskType: String(task.type),
    timestamp: session.finishedAt ?? new Date().toISOString(),
    executionTimeMs: durationMs,
    queueWaitMs,
    schedulerDelayMs,
    provider: aiResult.provider,
    model: aiResult.model,
    latencyMs: aiResult.latencyMs,
    fallback: aiResult.fallback,
    success: workerResult.success,
    warnings: session.warnings.length,
    retries: task.attemptCount,
  });

  history.recordSession(session, workerResult.success);

  return {
    session,
    task: runningTask ?? task,
    worker: registry.find(worker.id) ?? worker,
    workerResult,
    success: workerResult.success,
    skipped: false,
  };
}
