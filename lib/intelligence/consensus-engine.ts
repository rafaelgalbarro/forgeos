/** Executive Board consensus engine (Epic 3.2). */

import type { BoardMemberId, BoardOutput, ConsensusLevel } from "@/lib/ai-orchestration/types";

export interface BoardOpinion {
  member: BoardMemberId;
  opinion: string;
  argumentsFor: string[];
  argumentsAgainst: string[];
  risks: string[];
  opportunities: string[];
  confidence: number;
  suggestedAction: string;
  vote: string;
  source: "ai" | "heuristic" | "mock";
}

export interface ConsensusResult {
  level: ConsensusLevel;
  confidence: number;
  rationale: string;
  finalDecision: string;
  minorityOpinions: string[];
  agreements: string[];
  disagreements: string[];
  memberWeights: Record<string, number>;
}

const MEMBER_WEIGHTS: Partial<Record<BoardMemberId, number>> = {
  CEO: 1.2,
  CTO: 1.0,
  CPO: 1.0,
  CFO: 0.95,
  CMO: 0.9,
  COO: 0.9,
  Legal: 0.85,
  Growth: 0.85,
  Research: 0.9,
  UX: 0.85,
  Architecture: 0.9,
  Operations: 0.85,
  Data: 0.85,
};

function normalizeVote(vote: string): "approve" | "reject" | "defer" | "conditional" | "neutral" {
  const v = vote.toLowerCase();
  if (v.includes("reject") || v.includes("deny") || v.includes("no")) return "reject";
  if (v.includes("defer") || v.includes("wait") || v.includes("pending")) return "defer";
  if (v.includes("condition")) return "conditional";
  if (v.includes("approve") || v.includes("yes") || v.includes("proceed")) return "approve";
  return "neutral";
}

export function boardOutputToOpinion(
  output: BoardOutput,
  member: BoardMemberId,
  source: BoardOpinion["source"]
): BoardOpinion {
  return {
    member,
    opinion: output.opinion ?? output.position,
    argumentsFor: output.argumentsFor,
    argumentsAgainst: output.argumentsAgainst,
    risks: output.risks,
    opportunities: output.opportunities ?? [],
    confidence: output.confidence,
    suggestedAction: output.suggestedAction ?? output.position,
    vote: output.vote,
    source,
  };
}

export function buildConsensus(opinions: BoardOpinion[]): ConsensusResult {
  if (opinions.length === 0) {
    return {
      level: "CONFLICT",
      confidence: 0,
      rationale: "Sin opiniones del board.",
      finalDecision: "Requiere más contexto antes de decidir.",
      minorityOpinions: [],
      agreements: [],
      disagreements: [],
      memberWeights: {},
    };
  }

  const memberWeights: Record<string, number> = {};
  const voteBuckets: Record<string, BoardOpinion[]> = {
    approve: [],
    reject: [],
    defer: [],
    conditional: [],
    neutral: [],
  };

  let weightedConfidence = 0;
  let totalWeight = 0;

  for (const op of opinions) {
    const w = MEMBER_WEIGHTS[op.member] ?? 0.8;
    memberWeights[op.member] = w;
    weightedConfidence += op.confidence * w;
    totalWeight += w;
    voteBuckets[normalizeVote(op.vote)].push(op);
  }

  const avgConfidence = totalWeight > 0 ? weightedConfidence / totalWeight : 0;
  const dominantVote = (Object.entries(voteBuckets) as [keyof typeof voteBuckets, BoardOpinion[]][])
    .filter(([k]) => k !== "neutral")
    .sort((a, b) => b[1].length - a[1].length)[0];

  const dominantKey = dominantVote?.[0] ?? "neutral";
  const dominantCount = dominantVote?.[1].length ?? 0;
  const ratio = dominantCount / opinions.length;

  let level: ConsensusLevel;
  if (ratio >= 0.95) level = "UNANIMOUS";
  else if (ratio >= 0.75) level = "HIGH_CONSENSUS";
  else if (ratio >= 0.55) level = "MEDIUM_CONSENSUS";
  else if (ratio >= 0.4) level = "LOW_CONSENSUS";
  else level = "CONFLICT";

  const agreements = dominantVote?.[1].map((o) => `${o.member}: ${o.opinion}`) ?? [];
  const disagreements = opinions
    .filter((o) => normalizeVote(o.vote) !== dominantKey)
    .map((o) => `${o.member}: ${o.opinion}`);

  const minorityOpinions = disagreements.slice(0, 5);

  const topAction = opinions
    .sort((a, b) => b.confidence - a.confidence)[0]
    ?.suggestedAction;

  let finalDecision: string;
  switch (dominantKey) {
    case "approve":
      finalDecision = topAction ?? "Proceder con la recomendación del CEO.";
      break;
    case "reject":
      finalDecision = "Rechazar o pivotar la dirección actual.";
      break;
    case "defer":
      finalDecision = "Diferir decisión hasta obtener más validación.";
      break;
    case "conditional":
      finalDecision = topAction ?? "Aprobar con condiciones — completar validación primero.";
      break;
    default:
      finalDecision = topAction ?? "Mantener curso con revisión en 1-2 semanas.";
  }

  const rationale = `${dominantCount}/${opinions.length} miembros alineados (${level.replace("_", " ")}). Confianza media ponderada: ${(avgConfidence * 100).toFixed(0)}%.`;

  return {
    level,
    confidence: Math.round(avgConfidence * 100) / 100,
    rationale,
    finalDecision,
    minorityOpinions,
    agreements,
    disagreements,
    memberWeights,
  };
}
