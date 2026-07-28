export type { Worker, WorkerContext, WorkerResult, ForgeWorkerMeta } from "./types";
export { createStubWorker } from "./create-stub-worker";
export { ALL_WORKERS, WORKER_MAP, getWorker, getEnabledWorkers } from "./worker-registry";
export { runWorker, type OrchestratorRunOptions, type OrchestratorRunOutcome } from "./orchestrator";

export { ceoWorker } from "./implementations/ceo";
export { founderWorker } from "./implementations/founder";
export { researchWorker } from "./implementations/research";
export { productWorker } from "./implementations/product";
export { uxWorker } from "./implementations/ux";
export { ctoWorker } from "./implementations/cto";
export { databaseWorker } from "./implementations/database";
export { backendWorker } from "./implementations/backend";
export { frontendWorker } from "./implementations/frontend";
export { marketingWorker } from "./implementations/marketing";
export { legalWorker } from "./implementations/legal";
export { qaWorker } from "./implementations/qa";

export type WorkerStatus = "pending" | "running" | "done";

/** @deprecated Use ForgeWorkerMeta from worker instances. Kept for UI compatibility. */
export interface ForgeWorker {
  id: string;
  name: string;
  role: string;
  durationMs: number;
}

export const THINKING_PHRASES = [
  "ForgeOS está pensando...",
  "Analizando mercado...",
  "Buscando competidores...",
  "Detectando riesgos...",
  "Calculando viabilidad...",
  "Buscando modelos de negocio...",
  "Diseñando MVP...",
  "Creando arquitectura...",
  "Preparando lanzamiento...",
];

import { getEnabledWorkers } from "./worker-registry";

export const FORGE_WORKERS: ForgeWorker[] = getEnabledWorkers().map((w) => ({
  id: w.id,
  name: w.name,
  role: w.role,
  durationMs: w.durationMs,
}));
