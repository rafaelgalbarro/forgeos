import type { VentureProject } from "@/lib/domain/venture";
import { resolveLifecycleState, type VentureLifecycleStage } from "../lifecycle-engine";

export type VentureFsmState = VentureLifecycleStage;

const ALLOWED_TRANSITIONS: Record<VentureFsmState, VentureFsmState[]> = {
  ideation: ["discovery"],
  discovery: ["research", "validation"],
  research: ["validation", "building"],
  validation: ["building", "research"],
  building: ["ready", "validation"],
  ready: ["scaling", "building"],
  scaling: ["ready"],
};

export function canTransition(from: VentureFsmState, to: VentureFsmState): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getCurrentFsmState(venture: VentureProject): VentureFsmState {
  return resolveLifecycleState(venture).stage;
}

export function getAllowedNextStates(venture: VentureProject): VentureFsmState[] {
  const current = getCurrentFsmState(venture);
  return ALLOWED_TRANSITIONS[current] ?? [];
}
