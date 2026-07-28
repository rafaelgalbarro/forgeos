/** ForgeOS Skills — memory adapter (RC4). */

import { meshWriteDecision, meshWriteTimelineEvent } from "@/lib/executive-mesh/adapters/intelligence-adapter";

export function writeSkillDecisionGraph(params: {
  ventureId: string;
  skillId: string;
  output: string;
  confidence: number;
}): string {
  return meshWriteDecision({
    ventureId: params.ventureId,
    title: `Skill execution: ${params.skillId}`,
    rationale: params.output,
    recommendation: "Review skill result and approve next action",
    confidence: params.confidence,
  });
}

export function writeSkillTimeline(params: {
  ventureId: string;
  skillId: string;
  output: string;
}): string {
  return meshWriteTimelineEvent({
    ventureId: params.ventureId,
    title: `Skill: ${params.skillId}`,
    description: params.output,
  });
}
