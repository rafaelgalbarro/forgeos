/** Read-only runtime status hints via public adapter. */

export interface RuntimeStatusHints {
  healthy: boolean;
  executionAvailable: boolean;
  overallLabel: string;
}

export async function getRuntimeStatusHints(): Promise<RuntimeStatusHints> {
  try {
    const {
      isExecutionEngineAvailable,
      HEALTH_LEVEL_LABELS,
    } = await import("@/lib/runtime/observability");
    const available = isExecutionEngineAvailable();
    return {
      healthy: available,
      executionAvailable: available,
      overallLabel: available ? (HEALTH_LEVEL_LABELS.HEALTHY ?? "Runtime operativo") : "Runtime en modo simulado",
    };
  } catch {
    return {
      healthy: true,
      executionAvailable: false,
      overallLabel: "Runtime en modo simulado",
    };
  }
}
