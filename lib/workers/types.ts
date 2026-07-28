import type { VentureProject } from "@/lib/domain/venture";

export interface WorkerContext {
  venture: VentureProject;
  metadata: Record<string, unknown>;
}

export interface WorkerResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
}

export interface Worker {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  role: string;
  durationMs: number;
  run(context: WorkerContext): Promise<WorkerResult>;
  validate(context: WorkerContext): boolean | Promise<boolean>;
  rollback(context: WorkerContext): Promise<void>;
}

export type ForgeWorkerMeta = Pick<Worker, "id" | "name" | "role" | "durationMs">;
