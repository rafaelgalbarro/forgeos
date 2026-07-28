/** Mission Control — shared UI types (Epic 3.2.2). */

export type ExecutionPhase =
  | "ceo"
  | "board"
  | "consensus"
  | "decision"
  | "memory"
  | "finished";

export type PhaseStatus = "pending" | "running" | "done" | "error";

export interface PhaseState {
  phase: ExecutionPhase;
  status: PhaseStatus;
}

export const EXECUTION_PHASES: { phase: ExecutionPhase; label: string }[] = [
  { phase: "ceo", label: "CEO" },
  { phase: "board", label: "Board" },
  { phase: "consensus", label: "Consensus" },
  { phase: "decision", label: "Decision" },
  { phase: "memory", label: "Memory" },
  { phase: "finished", label: "Finished" },
];

export const DECISION_GRAPH_FLOW = [
  "Founder",
  "CEO",
  "Board",
  "Consensus",
  "Decision",
  "Memory",
  "Portfolio",
  "Build",
] as const;

export type DecisionGraphFlowNode = (typeof DECISION_GRAPH_FLOW)[number];

export interface ObservabilityEntry {
  id: string;
  timestamp: string;
  task: string;
  provider: string;
  runtime: string;
  sessionId?: string;
  decisionId?: string;
  latencyMs: number;
  costEstimate: number;
  confidence?: number;
  errors: string[];
  warnings: string[];
}

export interface DeveloperConsoleData {
  ceoResponse: unknown;
  boardResponses: unknown[];
  consensusOutput: unknown;
  validatorWarnings: string[];
  fallbackUsed: boolean;
  memoryWrites: unknown;
  decisionWrites: unknown;
}
