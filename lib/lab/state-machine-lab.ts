/** Lab harness for Venture State Machine (Epic 4.2) — isolated from production routes. */

import { createRuntimeEventBus } from "@/lib/runtime/event-bus/event-bus";
import type { RuntimeEvent } from "@/lib/runtime/event-bus/types";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";
import { createVentureStateMachine } from "@/lib/runtime/state-machine/state-machine";
import { LINEAR_PIPELINE, getStateLabel } from "@/lib/runtime/state-machine/states";
import { getExpandedAllowedTargets } from "@/lib/runtime/state-machine/transitions";
import type {
  GuardResult,
  TransitionHistoryRecord,
  TransitionResult,
  VentureState,
  VentureStateContext,
  VentureStateSnapshot,
} from "@/lib/runtime/state-machine/types";

export interface MockVentureProfile {
  id: string;
  name: string;
  description: string;
  initialState: VentureState;
  context: VentureStateContext;
}

export interface StateMachineLabSession {
  ventureId: string;
  machine: ReturnType<typeof createVentureStateMachine>;
  bus: ReturnType<typeof createRuntimeEventBus>;
  getSnapshot(): VentureStateSnapshot;
  getContext(): VentureStateContext;
  previewTransition(to: VentureState): GuardResult;
  attemptTransition(to: VentureState, reason?: string): TransitionResult;
  getHistory(): TransitionHistoryRecord[];
  getEmittedEvents(): RuntimeEvent[];
  getCandidateTargets(): VentureState[];
  reset(): void;
}

const MOCK_VENTURES: MockVentureProfile[] = [
  {
    id: LAB_MOCK_VENTURE_ID,
    name: "FleetPulse Lab",
    description: "Full context — ready to progress through pipeline.",
    initialState: "IDEA",
    context: {
      ventureId: LAB_MOCK_VENTURE_ID,
      discoveryComplete: true,
      discoveryArtifacts: ["problem statement", "customer interviews"],
      researchComplete: true,
      hasProductPrd: true,
      qaComplete: true,
      hasMinimumMetrics: true,
      metrics: { mrr: 5000, users: 120 },
      blockResolved: true,
    },
  },
  {
    id: "lab-mock-venture-empty",
    name: "Empty Discovery",
    description: "Discovery not started — RESEARCH guard should block.",
    initialState: "DISCOVERY",
    context: {
      ventureId: "lab-mock-venture-empty",
      discoveryComplete: false,
      discoveryArtifacts: [],
      researchComplete: false,
      hasProductPrd: false,
      qaComplete: false,
      hasMinimumMetrics: false,
      blockResolved: false,
    },
  },
  {
    id: "lab-mock-venture-build",
    name: "Pre-Build",
    description: "At PRODUCT — can advance to architecture; BUILD needs PRD.",
    initialState: "PRODUCT",
    context: {
      ventureId: "lab-mock-venture-build",
      discoveryComplete: true,
      discoveryArtifacts: ["PRD draft"],
      researchComplete: true,
      hasProductPrd: true,
      qaComplete: false,
      hasMinimumMetrics: false,
      blockResolved: true,
    },
  },
  {
    id: "lab-mock-venture-blocked",
    name: "Blocked Venture",
    description: "Paused mid-pipeline — test PAUSED/BLOCKED resume flows.",
    initialState: "PAUSED",
    context: {
      ventureId: "lab-mock-venture-blocked",
      discoveryComplete: true,
      discoveryArtifacts: ["validated"],
      researchComplete: true,
      hasProductPrd: false,
      qaComplete: false,
      hasMinimumMetrics: false,
      blockResolved: true,
    },
  },
];

export function listMockVentures(): MockVentureProfile[] {
  return [...MOCK_VENTURES];
}

function seedVentureState(
  machine: ReturnType<typeof createVentureStateMachine>,
  profile: MockVentureProfile,
): void {
  const target = profile.initialState;
  if (target === "IDEA") return;

  const targetIndex = LINEAR_PIPELINE.indexOf(target as (typeof LINEAR_PIPELINE)[number]);

  if (targetIndex >= 0) {
    for (let i = 0; i < targetIndex; i++) {
      const from = LINEAR_PIPELINE[i]!;
      const to = LINEAR_PIPELINE[i + 1]!;
      if (machine.getState(profile.id) !== from) break;
      machine.transition({
        ventureId: profile.id,
        to,
        reason: `Lab seed toward ${getStateLabel(target)}`,
        triggeredBy: "state-machine-lab",
        context: profile.context,
        metadata: { seed: true },
      });
    }
    return;
  }

  if (target === "PAUSED" || target === "BLOCKED") {
    const pauseFrom = "RESEARCH";
    const pauseIndex = LINEAR_PIPELINE.indexOf(pauseFrom);
    for (let i = 0; i < pauseIndex; i++) {
      const from = LINEAR_PIPELINE[i]!;
      const to = LINEAR_PIPELINE[i + 1]!;
      if (machine.getState(profile.id) !== from) break;
      machine.transition({
        ventureId: profile.id,
        to,
        reason: `Lab seed before ${target}`,
        triggeredBy: "state-machine-lab",
        context: profile.context,
        metadata: { seed: true },
      });
    }
    if (machine.getState(profile.id) === pauseFrom) {
      machine.transition({
        ventureId: profile.id,
        to: target,
        reason: `Lab seed special state ${target}`,
        triggeredBy: "state-machine-lab",
        context: profile.context,
        metadata: { seed: true },
      });
    }
  }
}

export function createStateMachineLab(profileId = LAB_MOCK_VENTURE_ID): StateMachineLabSession {
  const profile = MOCK_VENTURES.find((p) => p.id === profileId) ?? MOCK_VENTURES[0]!;
  const bus = createRuntimeEventBus();
  const machine = createVentureStateMachine({}, bus);

  seedVentureState(machine, profile);

  return {
    ventureId: profile.id,
    machine,
    bus,
    getSnapshot(): VentureStateSnapshot {
      return machine.getSnapshot(profile.id);
    },
    getContext(): VentureStateContext {
      return { ...profile.context, ventureId: profile.id };
    },
    previewTransition(to: VentureState): GuardResult {
      return machine.canTransition(profile.id, to, this.getContext());
    },
    attemptTransition(to: VentureState, reason = "Lab transition"): TransitionResult {
      return machine.transition({
        ventureId: profile.id,
        to,
        reason,
        triggeredBy: "state-machine-lab",
        context: this.getContext(),
      });
    },
    getHistory(): TransitionHistoryRecord[] {
      return machine.getHistory(profile.id, 100);
    },
    getEmittedEvents(): RuntimeEvent[] {
      return bus.getHistory(100);
    },
    getCandidateTargets(): VentureState[] {
      const snapshot = machine.getSnapshot(profile.id);
      return getExpandedAllowedTargets(
        snapshot.state,
        snapshot.resumeState,
        profile.context.blockResolved,
      );
    },
    reset(): void {
      machine.clear();
      bus.clear();
      seedVentureState(machine, profile);
    },
  };
}

export function getMockVentureProfile(id: string): MockVentureProfile | undefined {
  return MOCK_VENTURES.find((p) => p.id === id);
}
