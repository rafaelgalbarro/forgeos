/** ForgeOS Execution Engine — central orchestrator (Epic 4.5). */

import type {
  ExecutionEngine,
  ExecutionEngineContext,
  ExecutionEngineOptions,
  ExecutionResult,
} from "./types";
import { runSingleExecution } from "./execution-runner";
import { clearExecutionMemory } from "./memory-adapter";
import { clearExecutionDecisions } from "./decision-graph-adapter";

export function createExecutionEngine(
  ctx: ExecutionEngineContext,
  options: ExecutionEngineOptions = {},
): ExecutionEngine {
  const maxPerRun = options.maxSessionsPerRun ?? 20;

  return {
    runOnce(ventureId: string): ExecutionResult | null {
      return runSingleExecution(ctx, ventureId);
    },

    runBatch(ventureId: string, maxTasks = maxPerRun): ExecutionResult[] {
      const results: ExecutionResult[] = [];
      for (let i = 0; i < maxTasks; i++) {
        const result = runSingleExecution(ctx, ventureId);
        if (!result) break;
        results.push(result);
        if (result.skipped) break;
      }
      return results;
    },

    getActiveSessions() {
      return ctx.store.getActive();
    },

    getSession(sessionId: string) {
      return ctx.store.get(sessionId);
    },

    getSessions(ventureId?: string) {
      return ctx.store.list(ventureId);
    },

    clear() {
      ctx.store.clear();
      ctx.history.clear();
      ctx.telemetry.clear();
      clearExecutionMemory();
      clearExecutionDecisions();
    },
  };
}
