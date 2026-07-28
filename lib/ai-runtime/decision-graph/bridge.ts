/** ForgeOS AI Runtime — decision graph bridge (RC3). */

import { writeDecisionFromAi } from "@/lib/ai-orchestration/decision-graph-writer";
import type { AITask } from "@/lib/ai-gateway/types";

export function writeRuntimeDecision(params: {
  ventureId: string;
  task: AITask;
  output: string;
  confidence: number;
}): string | undefined {
  const title = `AI Runtime: ${params.task}`;
  const rationale = params.output.slice(0, 280);
  const entry = writeDecisionFromAi({
    ventureId: params.ventureId,
    sourceTask: params.task as never,
    title,
    rationale,
    recommendation: "Review AI output and approve next action",
    expectedImpact: `Confidence ${Math.round(params.confidence * 100)}%`,
    confidence: params.confidence,
    reversible: true,
    nodeType: "Recommendation",
  });
  return entry.decisionId;
}
