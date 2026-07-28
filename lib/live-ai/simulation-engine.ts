/** Live AI — dry-run simulation orchestrator (RC5.5). */

import {
  ALL_PANEL_IDS,
  SIMULATION_STAGES,
  type LiveAiPanelId,
  type LiveAiSimulationState,
  type LiveAiTimelineEvent,
  type PanelMessage,
  type PanelState,
  type SimulationContext,
  type SimulationEvent,
  type SimulationStageId,
} from "./types";

const STARTUP_PATTERNS = [
  /crea(r)?\s+(una\s+)?startup/i,
  /nueva\s+startup/i,
  /create\s+(a\s+)?startup/i,
  /lanza(r)?\s+(una\s+)?empresa/i,
  /build\s+(a\s+)?venture/i,
];

export function isStartupCommand(command: string): boolean {
  const trimmed = command.trim();
  if (!trimmed) return false;
  return STARTUP_PATTERNS.some((p) => p.test(trimmed));
}

function createInitialPanels(): Record<LiveAiPanelId, PanelState> {
  const panels = {} as Record<LiveAiPanelId, PanelState>;
  for (const id of ALL_PANEL_IDS) {
    panels[id] = { id, status: "idle", messages: [], highlight: false };
  }
  return panels;
}

export function createInitialSimulationState(): LiveAiSimulationState {
  return {
    status: "idle",
    context: null,
    currentStageId: null,
    stages: SIMULATION_STAGES,
    timeline: [],
    panels: createInitialPanels(),
    resultSummary: null,
  };
}

function stageMessage(stageId: SimulationStageId, ventureName: string): string {
  const messages: Record<SimulationStageId, string> = {
    ceo_receive: `Recibido: "${ventureName}" — priorizando en portfolio`,
    board_debate: "Board debate: CTO aprueba stack, CFO valida runway, CMO define GTM",
    research: "Research: TAM €2.1B, 3 competidores, oportunidad B2B pymes logística",
    product_prd: "Product: PRD MVP — dashboard flota, alertas, billing por vehículo",
    architecture: "Architecture: Next.js 15, Postgres, Stripe, Vercel preview",
    build: "Build: scaffolding app, API routes, schema DB — dry-run",
    capability_layer: "Capabilities: generate_application, deploy_preview — simulado",
    skills: "Skills: github, vercel, stripe routed — sin ejecución real",
    runtime: "Runtime: scheduler activo, event bus OK — observabilidad",
    task_queue: "Task Queue: RESEARCH_RUN → BUILD → MEMORY_WRITE encoladas",
    workers: "Workers: research-worker IDLE, build-worker BUSY",
    memory: "Memory: 3 registros persistidos — research, decision, build",
    decision_graph: "Decision Graph: Founder → CEO → Board → Build → Memory",
    ceo_deliver: `Entrega: "${ventureName}" lista para preview — simulación completa`,
  };
  return messages[stageId];
}

function deriveVentureName(command: string): string {
  const match = command.match(/(?:startup|empresa|venture)\s+(?:de|para|called|named)?\s*(.+)/i);
  if (match?.[1]) return match[1].trim().slice(0, 48);
  return "NovaStartup";
}

function appendPanelMessage(
  panels: Record<LiveAiPanelId, PanelState>,
  panel: LiveAiPanelId,
  text: string,
  kind: PanelMessage["kind"] = "info",
): Record<LiveAiPanelId, PanelState> {
  const msg: PanelMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text,
    timestamp: new Date().toISOString(),
    kind,
  };
  const current = panels[panel];
  return {
    ...panels,
    [panel]: {
      ...current,
      messages: [...current.messages.slice(-4), msg],
    },
  };
}

function applyStageBegin(
  state: LiveAiSimulationState,
  stageId: SimulationStageId,
  message: string,
): LiveAiSimulationState {
  const stage = SIMULATION_STAGES.find((s) => s.id === stageId)!;
  const timelineEvent: LiveAiTimelineEvent = {
    id: `tl-${stageId}-${Date.now()}`,
    stageId,
    timestamp: new Date().toISOString(),
    label: stage.label,
    message,
    panel: stage.panel,
    status: "active",
  };

  const panels = { ...state.panels };
  for (const id of ALL_PANEL_IDS) {
    panels[id] = {
      ...panels[id],
      highlight: id === stage.panel,
      status: id === stage.panel ? "active" : panels[id].status === "active" ? "done" : panels[id].status,
    };
  }

  const updatedTimeline = state.timeline.map((e) =>
    e.status === "active" ? { ...e, status: "done" as const } : e,
  );

  return {
    ...state,
    currentStageId: stageId,
    timeline: [...updatedTimeline, timelineEvent],
    panels: appendPanelMessage(panels, stage.panel, message, "info"),
  };
}

function applyStageEnd(state: LiveAiSimulationState, stageId: SimulationStageId): LiveAiSimulationState {
  const stage = SIMULATION_STAGES.find((s) => s.id === stageId)!;
  const panels = { ...state.panels };
  panels[stage.panel] = { ...panels[stage.panel], status: "done", highlight: false };

  const timeline = state.timeline.map((e) =>
    e.stageId === stageId && e.status === "active" ? { ...e, status: "done" as const } : e,
  );

  return { ...state, panels, timeline };
}

export type SimulationListener = (event: SimulationEvent, state: LiveAiSimulationState) => void;

export class LiveAiSimulationEngine {
  private state: LiveAiSimulationState = createInitialSimulationState();
  private abort = false;
  private listener: SimulationListener | null = null;

  getState(): LiveAiSimulationState {
    return this.state;
  }

  onUpdate(listener: SimulationListener): void {
    this.listener = listener;
  }

  private emit(event: SimulationEvent): void {
    this.listener?.(event, this.state);
  }

  private setState(next: LiveAiSimulationState): void {
    this.state = next;
  }

  reset(): void {
    this.abort = true;
    this.state = createInitialSimulationState();
    this.abort = false;
  }

  cancel(): void {
    this.abort = true;
    this.state = { ...this.state, status: "cancelled", currentStageId: null };
    this.emit({ type: "cancelled" });
  }

  async run(command: string): Promise<LiveAiSimulationState> {
    this.abort = false;
    const ventureName = deriveVentureName(command);
    const context: SimulationContext = {
      command,
      ventureName,
      dryRun: true,
      startedAt: new Date().toISOString(),
    };

    this.state = {
      ...createInitialSimulationState(),
      status: "running",
      context,
    };
    this.emit({ type: "started" });

    for (const stage of SIMULATION_STAGES) {
      if (this.abort) break;

      const message = stageMessage(stage.id, ventureName);
      this.state = applyStageBegin(this.state, stage.id, message);
      this.emit({ type: "stage_begin", stageId: stage.id, panel: stage.panel, message });

      await delay(stage.durationMs);
      if (this.abort) break;

      this.state = applyStageEnd(this.state, stage.id);
      this.emit({ type: "stage_end", stageId: stage.id, panel: stage.panel });
    }

    if (!this.abort) {
      const resultSummary = `Simulación completa: "${ventureName}" — pipeline CEO→Board→Research→Build→Runtime→Memory. Modo dry-run, sin ejecución real.`;
      this.state = {
        ...this.state,
        status: "completed",
        currentStageId: null,
        resultSummary,
        panels: appendPanelMessage(
          { ...this.state.panels, ceo: { ...this.state.panels.ceo, status: "done", highlight: true } },
          "ceo",
          resultSummary,
          "success",
        ),
      };
      this.emit({ type: "completed", resultSummary });
    }

    return this.state;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
