/** Executive runtime memory — never lose history (Epic 3.2). */

import { readStorage, writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import { recordVentureHistoryEvent } from "@/lib/intelligence-layer/history";
import { addCeoBriefing } from "@/lib/intelligence-layer/ceo-memory";
import type { BoardOpinion, ConsensusResult } from "@/lib/intelligence/consensus-engine";
import type { CeoOutput, ConsensusRecord } from "./types";

export interface ExecutiveRuntimeMemory {
  executiveDecisions: ExecutiveDecisionRecord[];
  ceoReviews: CeoReviewRecord[];
  boardReviews: BoardReviewRecord[];
  consensusHistory: ConsensusRecord[];
  strategicChanges: StrategicChangeRecord[];
  rejectedDecisions: ReversalRecord[];
  lessonsLearned: string[];
  updatedAt: string;
}

export interface ExecutiveDecisionRecord {
  id: string;
  ventureId: string;
  title: string;
  decision: string;
  confidence: number;
  createdAt: string;
  decisionGraphNodeId?: string;
}

export interface CeoReviewRecord {
  id: string;
  ventureId: string;
  taskId: string;
  output: CeoOutput;
  createdAt: string;
}

export interface BoardReviewRecord {
  id: string;
  ventureId: string;
  sessionId: string;
  opinions: BoardOpinion[];
  createdAt: string;
}

export interface StrategicChangeRecord {
  id: string;
  ventureId: string;
  change: string;
  rationale: string;
  createdAt: string;
}

export interface ReversalRecord {
  id: string;
  ventureId: string;
  originalDecision: string;
  reason: string;
  createdAt: string;
}

const EMPTY: ExecutiveRuntimeMemory = {
  executiveDecisions: [],
  ceoReviews: [],
  boardReviews: [],
  consensusHistory: [],
  strategicChanges: [],
  rejectedDecisions: [],
  lessonsLearned: [],
  updatedAt: new Date().toISOString(),
};

function readMemory(): ExecutiveRuntimeMemory {
  return readStorage<ExecutiveRuntimeMemory>(STORAGE_KEYS.executiveRuntime, EMPTY);
}

function saveMemory(memory: ExecutiveRuntimeMemory): void {
  writeStorage(STORAGE_KEYS.executiveRuntime, {
    ...memory,
    updatedAt: new Date().toISOString(),
  });
}

export function writeCeoReview(
  ventureId: string,
  taskId: string,
  output: CeoOutput
): CeoReviewRecord {
  const memory = readMemory();
  const record: CeoReviewRecord = {
    id: crypto.randomUUID(),
    ventureId,
    taskId,
    output,
    createdAt: new Date().toISOString(),
  };
  memory.ceoReviews.unshift(record);
  saveMemory(memory);

  addCeoBriefing({
    date: record.createdAt,
    summary: output.executiveSummary ?? output.summary,
    highlights: output.topPriorities ?? [output.priority],
  });

  recordVentureHistoryEvent({
    ventureId,
    type: "ceo_review",
    title: "CEO AI Review",
    description: output.summary,
    date: record.createdAt,
    metadata: { taskId, confidence: output.confidence },
  });

  return record;
}

export function writeBoardReview(
  ventureId: string,
  sessionId: string,
  opinions: BoardOpinion[]
): BoardReviewRecord {
  const memory = readMemory();
  const record: BoardReviewRecord = {
    id: crypto.randomUUID(),
    ventureId,
    sessionId,
    opinions,
    createdAt: new Date().toISOString(),
  };
  memory.boardReviews.unshift(record);
  saveMemory(memory);

  recordVentureHistoryEvent({
    ventureId,
    type: "board_review",
    title: "Executive Board Session",
    description: `${opinions.length} opiniones registradas`,
    date: record.createdAt,
    metadata: { sessionId },
  });

  return record;
}

export function writeConsensusHistory(
  ventureId: string,
  consensus: ConsensusResult,
  sessionId: string
): ConsensusRecord {
  const memory = readMemory();
  const record: ConsensusRecord = {
    id: crypto.randomUUID(),
    ventureId,
    level: consensus.level,
    confidence: consensus.confidence,
    rationale: consensus.rationale,
    finalDecision: consensus.finalDecision,
    minorityOpinions: consensus.minorityOpinions,
    memberCount: Object.keys(consensus.memberWeights).length,
    createdAt: new Date().toISOString(),
  };
  memory.consensusHistory.unshift(record);
  saveMemory(memory);

  recordVentureHistoryEvent({
    ventureId,
    type: "consensus",
    title: `Consensus: ${consensus.level}`,
    description: consensus.finalDecision,
    date: record.createdAt,
    metadata: { sessionId, level: consensus.level },
  });

  return record;
}

export function writeExecutiveDecision(
  ventureId: string,
  title: string,
  decision: string,
  confidence: number,
  decisionGraphNodeId?: string
): ExecutiveDecisionRecord {
  const memory = readMemory();
  const record: ExecutiveDecisionRecord = {
    id: crypto.randomUUID(),
    ventureId,
    title,
    decision,
    confidence,
    createdAt: new Date().toISOString(),
    decisionGraphNodeId,
  };
  memory.executiveDecisions.unshift(record);
  saveMemory(memory);
  return record;
}

export function appendLessonLearned(lesson: string): void {
  const memory = readMemory();
  if (!memory.lessonsLearned.includes(lesson)) {
    memory.lessonsLearned.unshift(lesson);
    memory.lessonsLearned = memory.lessonsLearned.slice(0, 200);
    saveMemory(memory);
  }
}

export function getExecutiveRuntimeMemory(): ExecutiveRuntimeMemory {
  return readMemory();
}
