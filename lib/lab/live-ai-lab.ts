/** Live AI Operations Center — lab harness (RC5.5). */

import { buildLiveAiRuntimeSnapshot, buildLiveAiSnapshot } from "@/lib/live-ai";
import { SIMULATION_STAGES, PANEL_LABELS } from "@/lib/live-ai/types";
import { isStartupCommand } from "@/lib/live-ai/simulation-engine";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";

export interface LiveAiLabSnapshot {
  ventureId: string;
  panelCount: number;
  stageCount: number;
  panels: typeof PANEL_LABELS;
  stages: typeof SIMULATION_STAGES;
  runtime: ReturnType<typeof buildLiveAiRuntimeSnapshot>;
  rc6: ReturnType<typeof buildLiveAiSnapshot>;
  sampleCommands: string[];
  dryRunOnly: boolean;
}

export function runLiveAiLab(ventureId = LAB_MOCK_VENTURE_ID): LiveAiLabSnapshot {
  const runtime = buildLiveAiRuntimeSnapshot(ventureId);

  return {
    ventureId,
    panelCount: Object.keys(PANEL_LABELS).length,
    stageCount: SIMULATION_STAGES.length,
    panels: PANEL_LABELS,
    stages: SIMULATION_STAGES,
    runtime,
    rc6: buildLiveAiSnapshot(),
    sampleCommands: [
      "Crea una startup de gestión de flotas",
      "Nueva startup SaaS B2B",
      "Create a startup for fleet management",
    ],
    dryRunOnly: !buildLiveAiSnapshot().realAiEnabled,
  };
}

export function validateLiveAiCommand(command: string): { valid: boolean; hint?: string } {
  if (!command.trim()) {
    return { valid: false, hint: "Escribe un comando para iniciar la simulación" };
  }
  if (!isStartupCommand(command)) {
    return {
      valid: false,
      hint: 'Prueba: "Crea una startup de gestión de flotas"',
    };
  }
  return { valid: true };
}
