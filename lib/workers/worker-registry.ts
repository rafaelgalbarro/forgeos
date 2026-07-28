import { ceoWorker } from "./implementations/ceo";
import { founderWorker } from "./implementations/founder";
import { researchWorker } from "./implementations/research";
import { productWorker } from "./implementations/product";
import { uxWorker } from "./implementations/ux";
import { ctoWorker } from "./implementations/cto";
import { databaseWorker } from "./implementations/database";
import { backendWorker } from "./implementations/backend";
import { frontendWorker } from "./implementations/frontend";
import { marketingWorker } from "./implementations/marketing";
import { legalWorker } from "./implementations/legal";
import { qaWorker } from "./implementations/qa";
import type { Worker } from "./types";

export const ALL_WORKERS: Worker[] = [
  ceoWorker,
  founderWorker,
  researchWorker,
  productWorker,
  uxWorker,
  ctoWorker,
  databaseWorker,
  backendWorker,
  frontendWorker,
  marketingWorker,
  legalWorker,
  qaWorker,
];

export const WORKER_MAP: Record<string, Worker> = Object.fromEntries(
  ALL_WORKERS.map((worker) => [worker.id, worker])
);

export function getWorker(id: string): Worker | undefined {
  return WORKER_MAP[id];
}

export function getEnabledWorkers(): Worker[] {
  return ALL_WORKERS.filter((worker) => worker.enabled);
}
