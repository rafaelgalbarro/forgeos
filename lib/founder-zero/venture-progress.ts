/** Program 4000 — Validation progress tracker. */

import type { ValidationProgress, ValidationStage } from "./types";

export function computeValidationProgress(stages: ValidationStage[]): ValidationProgress {
  const totalCount = stages.length;
  const completedCount = stages.filter((s) => s.status === "completed").length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const current =
    stages.find((s) => s.status === "in_progress" || s.status === "blocked") ??
    stages.find((s) => s.status === "not_started") ??
    null;

  return {
    completedCount,
    totalCount,
    percent,
    currentStageId: current?.id ?? null,
    currentStageLabel: current?.label ?? null,
  };
}
