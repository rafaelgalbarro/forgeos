/** ForgeOS Venture State Machine — official state definitions (Epic 4.2). */

import type { ActiveVentureState, VentureState } from "./types";

export interface VentureStateDefinition {
  state: VentureState;
  label: string;
  description: string;
  /** Linear pipeline order (null for special states). */
  pipelineIndex: number | null;
  isTerminal: boolean;
  isSpecial: boolean;
}

const DEFINITIONS: VentureStateDefinition[] = [
  {
    state: "IDEA",
    label: "Idea",
    description: "Initial venture concept registered.",
    pipelineIndex: 0,
    isTerminal: false,
    isSpecial: false,
  },
  {
    state: "DISCOVERY",
    label: "Discovery",
    description: "Clarifying problem, customer, and product direction.",
    pipelineIndex: 1,
    isTerminal: false,
    isSpecial: false,
  },
  {
    state: "RESEARCH",
    label: "Research",
    description: "Market, competitor, and validation research.",
    pipelineIndex: 2,
    isTerminal: false,
    isSpecial: false,
  },
  {
    state: "PRODUCT",
    label: "Product",
    description: "PRD, scope, and product definition.",
    pipelineIndex: 3,
    isTerminal: false,
    isSpecial: false,
  },
  {
    state: "ARCHITECTURE",
    label: "Architecture",
    description: "Technical architecture and system design.",
    pipelineIndex: 4,
    isTerminal: false,
    isSpecial: false,
  },
  {
    state: "UX",
    label: "UX",
    description: "User experience and interface design.",
    pipelineIndex: 5,
    isTerminal: false,
    isSpecial: false,
  },
  {
    state: "BUILD",
    label: "Build",
    description: "Implementation and engineering.",
    pipelineIndex: 6,
    isTerminal: false,
    isSpecial: false,
  },
  {
    state: "QA",
    label: "QA",
    description: "Quality assurance and release readiness.",
    pipelineIndex: 7,
    isTerminal: false,
    isSpecial: false,
  },
  {
    state: "LAUNCH",
    label: "Launch",
    description: "Go-to-market and initial release.",
    pipelineIndex: 8,
    isTerminal: false,
    isSpecial: false,
  },
  {
    state: "GROWTH",
    label: "Growth",
    description: "Acquisition, retention, and product-market fit scaling.",
    pipelineIndex: 9,
    isTerminal: false,
    isSpecial: false,
  },
  {
    state: "SCALE",
    label: "Scale",
    description: "Operational scaling and efficiency.",
    pipelineIndex: 10,
    isTerminal: false,
    isSpecial: false,
  },
  {
    state: "CAPITAL",
    label: "Capital",
    description: "Fundraising and capital strategy.",
    pipelineIndex: 11,
    isTerminal: false,
    isSpecial: false,
  },
  {
    state: "EXIT",
    label: "Exit",
    description: "Liquidity event or strategic exit.",
    pipelineIndex: 12,
    isTerminal: true,
    isSpecial: false,
  },
  {
    state: "PAUSED",
    label: "Paused",
    description: "Venture temporarily suspended; resumes to previous state.",
    pipelineIndex: null,
    isTerminal: false,
    isSpecial: true,
  },
  {
    state: "BLOCKED",
    label: "Blocked",
    description: "Venture blocked by unresolved issue; resumes when resolved.",
    pipelineIndex: null,
    isTerminal: false,
    isSpecial: true,
  },
  {
    state: "ARCHIVED",
    label: "Archived",
    description: "Venture archived; no further pipeline progression.",
    pipelineIndex: null,
    isTerminal: true,
    isSpecial: true,
  },
];

const definitionByState = new Map<VentureState, VentureStateDefinition>(
  DEFINITIONS.map((def) => [def.state, def]),
);

export const DEFAULT_VENTURE_STATE: VentureState = "IDEA";

export const LINEAR_PIPELINE: ActiveVentureState[] = DEFINITIONS.filter(
  (def) => def.pipelineIndex !== null,
)
  .sort((a, b) => (a.pipelineIndex ?? 0) - (b.pipelineIndex ?? 0))
  .map((def) => def.state as ActiveVentureState);

export const SPECIAL_STATES: VentureState[] = ["PAUSED", "BLOCKED", "ARCHIVED"];

export const ALL_VENTURE_STATES: VentureState[] = DEFINITIONS.map((def) => def.state);

export function getStateDefinition(state: VentureState): VentureStateDefinition {
  const def = definitionByState.get(state);
  if (!def) {
    throw new Error(`Unknown venture state: ${state}`);
  }
  return def;
}

export function getStateLabel(state: VentureState): string {
  return getStateDefinition(state).label;
}

export function isActiveState(state: VentureState): state is ActiveVentureState {
  return !getStateDefinition(state).isSpecial;
}

export function isSpecialState(state: VentureState): boolean {
  return getStateDefinition(state).isSpecial;
}

export function listStateDefinitions(): VentureStateDefinition[] {
  return [...DEFINITIONS];
}
