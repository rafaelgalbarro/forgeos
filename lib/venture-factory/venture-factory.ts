/** Venture Factory — main entry + simulation engine (RC7) */

import {
  VENTURE_FACTORY_STAGES,
  buildVentureOutput,
  createVentureContext,
  stageMessage,
} from "./factory-pipeline";
import type {
  VentureFactoryEvent,
  VentureFactoryState,
  VentureFactoryStageId,
  VentureFactoryTimelineEvent,
} from "./types";

export { VENTURE_FACTORY_STAGES, buildVentureOutput, createVentureContext, stageMessage } from "./factory-pipeline";

const VENTURE_PATTERNS = [
  /crea(r)?\s+(una\s+)?empresa/i,
  /nueva\s+empresa/i,
  /create\s+(a\s+)?company/i,
  /crea(r)?\s+(una\s+)?startup/i,
  /lanza(r)?\s+(una\s+)?empresa/i,
  /venture\s+factory/i,
  /gafas/i,
  /empresa\s+de/i,
];

export function isVentureFactoryCommand(command: string): boolean {
  const trimmed = command.trim();
  if (!trimmed) return false;
  if (trimmed.length >= 12) return true;
  return VENTURE_PATTERNS.some((p) => p.test(trimmed));
}

export function createInitialVentureFactoryState(): VentureFactoryState {
  return {
    status: "idle",
    context: null,
    currentStageId: null,
    stages: VENTURE_FACTORY_STAGES,
    timeline: [],
    progress: 0,
    output: null,
    resultSummary: null,
  };
}

export type VentureFactoryListener = (event: VentureFactoryEvent, state: VentureFactoryState) => void;

export class VentureFactoryEngine {
  private state: VentureFactoryState = createInitialVentureFactoryState();
  private abort = false;
  private listener: VentureFactoryListener | null = null;

  getState(): VentureFactoryState {
    return this.state;
  }

  onUpdate(listener: VentureFactoryListener): void {
    this.listener = listener;
  }

  private emit(event: VentureFactoryEvent): void {
    this.listener?.(event, this.state);
  }

  reset(): void {
    this.abort = true;
    this.state = createInitialVentureFactoryState();
    this.abort = false;
  }

  cancel(): void {
    this.abort = true;
    this.state = { ...this.state, status: "cancelled", currentStageId: null };
    this.emit({ type: "cancelled" });
  }

  async run(command: string): Promise<VentureFactoryState> {
    this.abort = false;
    const context = createVentureContext(command);
    const totalStages = VENTURE_FACTORY_STAGES.length;

    this.state = {
      ...createInitialVentureFactoryState(),
      status: "running",
      context,
    };
    this.emit({ type: "started" });

    for (let i = 0; i < VENTURE_FACTORY_STAGES.length; i++) {
      if (this.abort) break;

      const stage = VENTURE_FACTORY_STAGES[i];
      const message = stageMessage(stage.id, context);

      this.state = applyStageBegin(this.state, stage.id, message, i, totalStages);
      this.emit({ type: "stage_begin", stageId: stage.id, message });

      await delay(stage.durationMs);
      if (this.abort) break;

      this.state = applyStageEnd(this.state, stage.id, i + 1, totalStages);
      this.emit({ type: "stage_end", stageId: stage.id });
    }

    if (!this.abort) {
      const output = buildVentureOutput(command);
      const resultSummary = `Venture Factory completa: "${output.companyName}" — 18 etapas simuladas. Modo dry-run, sin ejecución real.`;
      this.state = {
        ...this.state,
        status: "completed",
        currentStageId: null,
        progress: 100,
        output,
        resultSummary,
      };
      this.emit({ type: "completed", resultSummary });
    }

    return this.state;
  }
}

function applyStageBegin(
  state: VentureFactoryState,
  stageId: VentureFactoryStageId,
  message: string,
  index: number,
  total: number,
): VentureFactoryState {
  const stage = VENTURE_FACTORY_STAGES.find((s) => s.id === stageId)!;
  const timelineEvent: VentureFactoryTimelineEvent = {
    id: `vf-${stageId}-${Date.now()}`,
    stageId,
    timestamp: new Date().toISOString(),
    label: stage.label,
    message,
    status: "active",
  };

  const updatedTimeline = state.timeline.map((e) =>
    e.status === "active" ? { ...e, status: "done" as const } : e,
  );

  return {
    ...state,
    currentStageId: stageId,
    progress: Math.round((index / total) * 100),
    timeline: [...updatedTimeline, timelineEvent],
  };
}

function applyStageEnd(
  state: VentureFactoryState,
  stageId: VentureFactoryStageId,
  completed: number,
  total: number,
): VentureFactoryState {
  const timeline = state.timeline.map((e) =>
    e.stageId === stageId && e.status === "active" ? { ...e, status: "done" as const } : e,
  );

  return {
    ...state,
    timeline,
    progress: Math.round((completed / total) * 100),
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Synchronous preview — no animation */
export function previewVenture(command: string) {
  return buildVentureOutput(command);
}
