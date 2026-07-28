/** ForgeOS Capability Layer — adapters: memory (RC4.9). */

import { meshWriteDecision, meshWriteTimelineEvent } from "@/lib/executive-mesh/adapters/intelligence-adapter";

export function writeCapabilityDecisionGraph(params: {
  ventureId: string;
  capabilityId: string;
  output: string;
  confidence: number;
}): string {
  return meshWriteDecision({
    ventureId: params.ventureId,
    title: `Capability execution: ${params.capabilityId}`,
    rationale: params.output,
    recommendation: "Review capability result and approve next action",
    confidence: params.confidence,
  });
}

export function writeCapabilityTimeline(params: {
  ventureId: string;
  capabilityId: string;
  output: string;
}): string {
  return meshWriteTimelineEvent({
    ventureId: params.ventureId,
    title: `Capability: ${params.capabilityId}`,
    description: params.output,
  });
}
