/** ForgeOS AI Orchestration — decision graph writer. */

import { registerDecision } from "@/lib/intelligence-layer/decision-engine";
import { readStorage, writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import type {
  CeoOutput,
  DecisionGraphEntry,
  ExecutiveGraphNode,
  ExecutiveNodeType,
  OrchestrationTaskId,
} from "./types";

export interface WriteDecisionParams {
  ventureId: string;
  sourceTask: OrchestrationTaskId;
  title: string;
  rationale: string;
  recommendation: string;
  expectedImpact: string;
  confidence: number;
  reversible?: boolean;
  nodeType?: ExecutiveNodeType;
  dependencies?: string[];
}

function readExecutiveGraph(): ExecutiveGraphNode[] {
  return readStorage<ExecutiveGraphNode[]>(STORAGE_KEYS.executiveGraph, []);
}

function writeExecutiveGraph(nodes: ExecutiveGraphNode[]): void {
  writeStorage(STORAGE_KEYS.executiveGraph, nodes.slice(0, 2000));
}

export function writeExecutiveGraphNode(params: {
  ventureId: string;
  nodeType: ExecutiveNodeType;
  source: string;
  title: string;
  rationale: string;
  impact: string;
  confidence: number;
  reversible?: boolean;
  dependencies?: string[];
}): ExecutiveGraphNode {
  const node: ExecutiveGraphNode = {
    id: crypto.randomUUID(),
    ventureId: params.ventureId,
    nodeType: params.nodeType,
    source: params.source,
    title: params.title,
    rationale: params.rationale,
    impact: params.impact,
    confidence: params.confidence,
    reversible: params.reversible ?? true,
    dependencies: params.dependencies ?? [],
    createdAt: new Date().toISOString(),
  };
  const nodes = readExecutiveGraph();
  nodes.unshift(node);
  writeExecutiveGraph(nodes);
  return node;
}

export function getExecutiveGraphForVenture(ventureId: string): ExecutiveGraphNode[] {
  return readExecutiveGraph().filter((n) => n.ventureId === ventureId);
}

export function writeDecisionFromAi(params: WriteDecisionParams): DecisionGraphEntry {
  const decision = registerDecision({
    ventureId: params.ventureId,
    title: params.title,
    description: params.recommendation,
    motive: params.rationale,
    takenBy: "forgeos-ai",
    date: new Date().toISOString(),
    expectedImpact: params.expectedImpact,
    reversible: params.reversible ?? true,
    dependencies: params.dependencies ?? [params.sourceTask],
    status: "active",
  });

  if (params.nodeType) {
    writeExecutiveGraphNode({
      ventureId: params.ventureId,
      nodeType: params.nodeType,
      source: params.sourceTask,
      title: params.title,
      rationale: params.rationale,
      impact: params.expectedImpact,
      confidence: params.confidence,
      reversible: params.reversible,
      dependencies: params.dependencies,
    });
  }

  return {
    decisionId: decision.id,
    ventureId: params.ventureId,
    sourceTask: params.sourceTask,
    title: params.title,
    rationale: params.rationale,
    recommendation: params.recommendation,
    expectedImpact: params.expectedImpact,
    confidence: params.confidence,
    reversible: params.reversible ?? true,
    createdAt: decision.date,
  };
}

export function writeCeoDecisionFromOutput(
  ventureId: string,
  taskId: OrchestrationTaskId,
  output: CeoOutput
): DecisionGraphEntry | null {
  if (!output.recommendation?.trim()) return null;

  const risks = output.criticalRisks ?? output.risks;
  for (const risk of risks.slice(0, 3)) {
    writeExecutiveGraphNode({
      ventureId,
      nodeType: "Risk",
      source: taskId,
      title: risk,
      rationale: output.summary,
      impact: "Risk mitigation required",
      confidence: output.confidence ?? 0.7,
    });
  }

  for (const opp of (output.growthOpportunities ?? []).slice(0, 3)) {
    writeExecutiveGraphNode({
      ventureId,
      nodeType: "Opportunity",
      source: taskId,
      title: opp,
      rationale: output.summary,
      impact: output.expectedImpact,
      confidence: output.confidence ?? 0.7,
    });
  }

  for (const blocked of (output.blockedVentures ?? []).slice(0, 3)) {
    writeExecutiveGraphNode({
      ventureId,
      nodeType: "Blocked",
      source: taskId,
      title: blocked,
      rationale: output.summary,
      impact: "Requires founder attention",
      confidence: output.confidence ?? 0.65,
    });
  }

  return writeDecisionFromAi({
    ventureId,
    sourceTask: taskId,
    title: output.priority || `CEO decision — ${taskId}`,
    rationale: output.executiveSummary ?? output.summary,
    recommendation: output.recommendation,
    expectedImpact: output.expectedImpact,
    confidence: output.confidence ?? 0.75,
    reversible: true,
    nodeType: "Decision",
  });
}

export function writeConsensusDecision(
  ventureId: string,
  finalDecision: string,
  rationale: string,
  confidence: number,
  level: string,
  sessionId: string
): ExecutiveGraphNode {
  return writeExecutiveGraphNode({
    ventureId,
    nodeType: level === "CONFLICT" ? "Deferred" : "Approved",
    source: `consensus:${sessionId}`,
    title: `Executive consensus — ${level}`,
    rationale,
    impact: finalDecision,
    confidence,
    dependencies: [sessionId],
  });
}
