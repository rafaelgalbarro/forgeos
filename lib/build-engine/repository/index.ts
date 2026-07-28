import type { VentureProject } from "@/lib/domain/venture";
import type { BuildQueueItem } from "../types";
import { generateArtifacts } from "../generator";
import { resolveQueueState, statePhaseLabel, stateProgress } from "../planner";

export function buildQueueItem(venture: VentureProject): BuildQueueItem {
  const state = resolveQueueState(venture);
  return {
    id: `queue-${venture.id}`,
    ventureId: venture.id,
    ventureName: venture.name,
    state,
    progress: stateProgress(state),
    currentPhase: statePhaseLabel(state),
    artifacts: generateArtifacts(venture),
    startedAt: venture.status !== "intelligence" ? venture.createdAt : null,
    updatedAt: venture.updatedAt,
  };
}

export function buildQueue(ventures: VentureProject[]): BuildQueueItem[] {
  return ventures
    .filter((v) => v.productPRD || v.status === "building" || v.status === "ready")
    .map(buildQueueItem)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
