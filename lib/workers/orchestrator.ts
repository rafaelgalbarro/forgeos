import { getKnowledgeForWorker } from "@/lib/knowledge/knowledge-queries";
import type { VentureProject } from "@/lib/domain/venture";
import { getWorker } from "./worker-registry";
import type { WorkerContext, WorkerResult } from "./types";

export interface OrchestratorRunOptions {
  venture: VentureProject;
  workerId: string;
  metadata?: Record<string, unknown>;
}

export interface OrchestratorRunOutcome {
  workerId: string;
  result: WorkerResult;
}

export async function runWorker(options: OrchestratorRunOptions): Promise<OrchestratorRunOutcome> {
  const worker = getWorker(options.workerId);
  if (!worker || !worker.enabled) {
    return {
      workerId: options.workerId,
      result: { success: false, error: `Worker not found or disabled: ${options.workerId}` },
    };
  }

  const context: WorkerContext = {
    venture: options.venture,
    metadata: {
      ...(options.metadata ?? {}),
      knowledgeRefs: getKnowledgeForWorker(options.workerId, { limit: 6 }).map((e) => ({
        id: e.id,
        domain: e.domain,
        title: e.title,
      })),
    },
  };

  const valid = await worker.validate(context);
  if (!valid) {
    return { workerId: options.workerId, result: { success: false, error: "Validation failed" } };
  }

  try {
    const result = await worker.run(context);
    if (!result.success) {
      await worker.rollback(context);
    }
    return { workerId: options.workerId, result };
  } catch (error) {
    await worker.rollback(context);
    return {
      workerId: options.workerId,
      result: {
        success: false,
        error: error instanceof Error ? error.message : "Worker execution failed",
      },
    };
  }
}
