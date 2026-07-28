import type { Worker, WorkerContext, WorkerResult } from "./types";

export interface StubWorkerConfig {
  id: string;
  name: string;
  role: string;
  durationMs: number;
  version?: string;
  enabled?: boolean;
  run?: (context: WorkerContext) => Promise<WorkerResult>;
  validate?: (context: WorkerContext) => boolean | Promise<boolean>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createStubWorker(config: StubWorkerConfig): Worker {
  const {
    id,
    name,
    role,
    durationMs,
    version = "1.0.0",
    enabled = true,
    run,
    validate,
  } = config;

  return {
    id,
    name,
    version,
    enabled,
    role,
    durationMs,
    async run(context) {
      if (run) return run(context);
      await sleep(durationMs);
      return { success: true, output: { workerId: id } };
    },
    async validate(context) {
      if (validate) return validate(context);
      return Boolean(context.venture.ideaText.trim());
    },
    async rollback() {
      /* no-op until persistent side effects exist */
    },
  };
}
