import type { FosModuleId } from "../types";

export type FosScheduledTask = {
  moduleId: FosModuleId;
  order: number;
};

const DEFAULT_PIPELINE: FosScheduledTask[] = [
  { moduleId: "context-engine", order: 1 },
  { moduleId: "lifecycle-engine", order: 2 },
  { moduleId: "state-machine", order: 3 },
  { moduleId: "portfolio-engine", order: 4 },
  { moduleId: "priority-engine", order: 5 },
  { moduleId: "attention-engine", order: 6 },
  { moduleId: "decision-engine", order: 7 },
  { moduleId: "worker-coordinator", order: 8 },
];

export function getScheduledPipeline(): FosScheduledTask[] {
  return [...DEFAULT_PIPELINE].sort((a, b) => a.order - b.order);
}

export function getModuleOrder(moduleId: FosModuleId): number {
  const task = DEFAULT_PIPELINE.find((t) => t.moduleId === moduleId);
  return task?.order ?? 99;
}
