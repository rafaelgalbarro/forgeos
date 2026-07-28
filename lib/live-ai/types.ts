/** Live AI Operations Center — simulation types (RC5.5). */

export type LiveAiPanelId =
  | "ceo"
  | "mesh"
  | "departments"
  | "skills"
  | "capabilities"
  | "runtime"
  | "taskQueue"
  | "workers"
  | "memory"
  | "decisionGraph"
  | "research"
  | "build"
  | "timeline";

export type SimulationStageId =
  | "ceo_receive"
  | "board_debate"
  | "research"
  | "product_prd"
  | "architecture"
  | "build"
  | "capability_layer"
  | "skills"
  | "runtime"
  | "task_queue"
  | "workers"
  | "memory"
  | "decision_graph"
  | "ceo_deliver";

export type PanelActivityStatus = "idle" | "active" | "done" | "error";

export interface SimulationStage {
  id: SimulationStageId;
  label: string;
  panel: LiveAiPanelId;
  durationMs: number;
}

export const SIMULATION_STAGES: SimulationStage[] = [
  { id: "ceo_receive", label: "CEO recibe", panel: "ceo", durationMs: 900 },
  { id: "board_debate", label: "Board debate", panel: "mesh", durationMs: 1200 },
  { id: "research", label: "Research", panel: "research", durationMs: 1100 },
  { id: "product_prd", label: "Product PRD", panel: "departments", durationMs: 1000 },
  { id: "architecture", label: "Architecture", panel: "departments", durationMs: 1000 },
  { id: "build", label: "Build", panel: "build", durationMs: 1300 },
  { id: "capability_layer", label: "Capability Layer", panel: "capabilities", durationMs: 900 },
  { id: "skills", label: "Skills", panel: "skills", durationMs: 800 },
  { id: "runtime", label: "Runtime", panel: "runtime", durationMs: 900 },
  { id: "task_queue", label: "Task Queue", panel: "taskQueue", durationMs: 700 },
  { id: "workers", label: "Workers", panel: "workers", durationMs: 800 },
  { id: "memory", label: "Memory", panel: "memory", durationMs: 700 },
  { id: "decision_graph", label: "Decision Graph", panel: "decisionGraph", durationMs: 800 },
  { id: "ceo_deliver", label: "CEO entrega resultado", panel: "ceo", durationMs: 1000 },
];

export interface LiveAiTimelineEvent {
  id: string;
  stageId: SimulationStageId;
  timestamp: string;
  label: string;
  message: string;
  panel: LiveAiPanelId;
  status: "pending" | "active" | "done";
}

export interface PanelMessage {
  id: string;
  text: string;
  timestamp: string;
  kind: "info" | "success" | "warning";
}

export interface PanelState {
  id: LiveAiPanelId;
  status: PanelActivityStatus;
  messages: PanelMessage[];
  highlight: boolean;
}

export interface SimulationContext {
  command: string;
  ventureName: string;
  dryRun: true;
  startedAt: string;
}

export type SimulationStatus = "idle" | "running" | "completed" | "cancelled";

export interface LiveAiSimulationState {
  status: SimulationStatus;
  context: SimulationContext | null;
  currentStageId: SimulationStageId | null;
  stages: SimulationStage[];
  timeline: LiveAiTimelineEvent[];
  panels: Record<LiveAiPanelId, PanelState>;
  resultSummary: string | null;
}

export interface SimulationEvent {
  type:
    | "started"
    | "stage_begin"
    | "stage_end"
    | "panel_message"
    | "completed"
    | "cancelled";
  stageId?: SimulationStageId;
  panel?: LiveAiPanelId;
  message?: string;
  resultSummary?: string;
}

export const ALL_PANEL_IDS: LiveAiPanelId[] = [
  "ceo",
  "mesh",
  "departments",
  "skills",
  "capabilities",
  "runtime",
  "taskQueue",
  "workers",
  "memory",
  "decisionGraph",
  "research",
  "build",
  "timeline",
];

export const PANEL_LABELS: Record<LiveAiPanelId, string> = {
  ceo: "CEO",
  mesh: "Executive Mesh",
  departments: "Departamentos",
  skills: "Skills",
  capabilities: "Capability Layer",
  runtime: "Runtime",
  taskQueue: "Task Queue",
  workers: "Workers",
  memory: "Memory",
  decisionGraph: "Decision Graph",
  research: "Research",
  build: "Build",
  timeline: "Timeline",
};
