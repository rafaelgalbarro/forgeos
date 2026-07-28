/** Executive Mesh — Executive Protocol (RC4.9). */

import {
  executeMeshCapabilityForTopic,
  resolveCapabilityForTopic,
} from "@/lib/capabilities/adapters/mesh-adapter";
import type { CapabilityResult } from "@/lib/capabilities/types";
import { processExecutiveMeshRequest } from "./decision-pipeline";
import { runMeshEngine } from "./mesh-engine";
import type { FounderRequest } from "./types";

export interface ExecutiveProtocolResult {
  protocolId: string;
  meshResult: Awaited<ReturnType<typeof processExecutiveMeshRequest>>;
  meshTurns: ReturnType<typeof runMeshEngine>;
  capabilityResults: CapabilityResult[];
  stages: string[];
  latencyMs: number;
}

export async function runExecutiveProtocol(
  request: FounderRequest
): Promise<ExecutiveProtocolResult> {
  const started = Date.now();
  const stages = [
    "founder",
    "ceo",
    "executive-mesh",
    "departments",
    "consensus",
    "capability-request",
    "capability-resolver",
    "skill-router",
    "skill-execution",
    "runtime",
    "memory",
    "decision-graph",
    "founder-response",
  ];

  const meshResult = await processExecutiveMeshRequest(request);
  const capCfg = resolveCapabilityForTopic(request.topic);

  const meshTurns = runMeshEngine({
    topic: request.topic,
    initiator: capCfg.dept,
    capabilityRequest: { capabilityId: capCfg.capabilityId, action: capCfg.action },
  });

  const capabilityResults: CapabilityResult[] = [];
  const capabilityResult = await executeMeshCapabilityForTopic(
    request.topic,
    request.ventureId
  );
  capabilityResults.push(capabilityResult);

  return {
    protocolId: meshResult.requestId,
    meshResult,
    meshTurns,
    capabilityResults,
    stages,
    latencyMs: Date.now() - started,
  };
}
