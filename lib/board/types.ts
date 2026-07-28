export type BoardMemberRole =
  | "CEO"
  | "CTO"
  | "CPO"
  | "CMO"
  | "CFO"
  | "COO"
  | "Legal"
  | "Growth"
  | "Data";

export type BoardVote = "approve" | "reject" | "abstain";

export interface BoardMemberProfile {
  role: BoardMemberRole;
  name: string;
  objectives: string[];
  priorities: string[];
  criteria: string[];
  specialization: string;
  memory: string[];
}

export interface BoardArgument {
  member: BoardMemberRole;
  point: string;
  weight: number;
}

export interface BoardDebateResult {
  pros: BoardArgument[];
  contras: BoardArgument[];
  riesgos: BoardArgument[];
  oportunidades: BoardArgument[];
}

export interface BoardConsensus {
  score: number;
  label: string;
  supporting: BoardMemberRole[];
  dissenting: BoardMemberRole[];
}

export interface BoardDecision {
  question: string;
  debate: BoardDebateResult;
  consensus: BoardConsensus;
  finalDecision: string;
  rationale: string;
  decidedAt: string;
}

export interface BoardSession {
  id: string;
  question: string;
  members: BoardMemberRole[];
  decision: BoardDecision;
}

export interface BoardEngineOutput {
  session: BoardSession;
  members: BoardMemberProfile[];
}
