/** Live execution progressive status. */

import type { LiveExecutionStatus, LiveExecutionStep, Mission } from "./types";
import { factoryProgressSteps } from "./smart-routing";

export function buildExecutionSteps(intention: NonNullable<Mission["intention"]>): LiveExecutionStep[] {
  const labels = factoryProgressSteps(intention);
  return labels.map((label, i) => ({
    id: `exec-${i}`,
    label,
    department: label.split(" ")[0],
    status: "pending" as const,
  }));
}

export function startLiveExecution(mission: Mission): Mission {
  if (!mission.intention) return mission;
  const steps = buildExecutionSteps(mission.intention);
  return {
    ...mission,
    liveExecution: { active: true, steps, currentStepId: steps[0]?.id },
    status: {
      ...mission.status,
      ceoStatus: "Equipo ejecutivo trabajando…",
      activeDepartments: steps.map((s) => s.label),
      confidence: Math.min(mission.status.confidence + 10, 95),
    },
  };
}

export function advanceExecutionStep(mission: Mission): Mission {
  const { liveExecution } = mission;
  if (!liveExecution.active || !liveExecution.steps.length) return mission;

  const steps = [...liveExecution.steps];
  const currentIdx = steps.findIndex((s) => s.status === "working" || s.status === "pending");
  if (currentIdx < 0) {
    return { ...mission, liveExecution: { ...liveExecution, active: false } };
  }

  steps[currentIdx] = { ...steps[currentIdx], status: "completed" };
  const nextIdx = currentIdx + 1;
  if (nextIdx < steps.length) {
    steps[nextIdx] = { ...steps[nextIdx], status: "working" };
    return {
      ...mission,
      liveExecution: { active: true, steps, currentStepId: steps[nextIdx].id },
    };
  }

  return {
    ...mission,
    liveExecution: { active: false, steps, currentStepId: undefined },
    status: {
      ...mission.status,
      ceoStatus: "Ejecución completada",
      confidence: Math.min(mission.status.confidence + 15, 98),
    },
  };
}

export function executionProgressPercent(status: LiveExecutionStatus): number {
  if (!status.steps.length) return 0;
  const done = status.steps.filter((s) => s.status === "completed").length;
  return Math.round((done / status.steps.length) * 100);
}

export function isExecutionComplete(status: LiveExecutionStatus): boolean {
  return status.steps.length > 0 && status.steps.every((s) => s.status === "completed");
}
