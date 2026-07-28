/** Lab harness for Runtime Scheduler (Epic 4.1) — isolated from production routes. */

import { createRuntimeEventBus } from "@/lib/runtime/event-bus/event-bus";
import type { PublishInput, RuntimeEventType } from "@/lib/runtime/event-bus/types";
import {
  connectSchedulerToEventBus,
  createRuntimeScheduler,
  type ConnectedRuntimeScheduler,
} from "@/lib/runtime/scheduler/scheduler";
import type { SchedulerSnapshot } from "@/lib/runtime/scheduler/types";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";

export interface RuntimeSchedulerLabSession {
  scheduler: ConnectedRuntimeScheduler;
  ventureId: string;
  publishMockEvent(type: RuntimeEventType): void;
  getSnapshot(): SchedulerSnapshot;
  reset(): void;
}

export interface MockEventDefinition {
  type: RuntimeEventType;
  label: string;
  description: string;
}

export const MOCK_EVENT_DEFINITIONS: MockEventDefinition[] = [
  {
    type: "VENTURE_CREATED",
    label: "Venture Created",
    description: "Enqueue discovery review for a new venture.",
  },
  {
    type: "DISCOVERY_COMPLETED",
    label: "Discovery Completed",
    description: "Complete discovery and enqueue research run.",
  },
  {
    type: "RESEARCH_COMPLETED",
    label: "Research Completed",
    description: "Complete research and enqueue product + simulator updates.",
  },
  {
    type: "CEO_DECISION_CREATED",
    label: "CEO Decision",
    description: "Record CEO review and unblock board dependency chain.",
  },
  {
    type: "BOARD_CONSENSUS_REACHED",
    label: "Board Consensus",
    description: "Record board review and enqueue build plan update.",
  },
  {
    type: "RISK_DETECTED",
    label: "Risk Detected",
    description: "Enqueue critical-path risk review (P0 when critical).",
  },
  {
    type: "OPPORTUNITY_DETECTED",
    label: "Opportunity Detected",
    description: "Enqueue opportunity review.",
  },
  {
    type: "MEMORY_UPDATED",
    label: "Memory Updated",
    description: "Record memory write task (completed on ingest).",
  },
];

function buildMockPayload(type: RuntimeEventType, ventureId: string): PublishInput<RuntimeEventType>["payload"] {
  switch (type) {
    case "VENTURE_CREATED":
      return { ventureId, name: "FleetPulse Lab", idea: "Mock venture for scheduler lab" };
    case "DISCOVERY_COMPLETED":
      return { ventureId, stage: "discovery", summary: "Discovery stage completed in lab" };
    case "RESEARCH_COMPLETED":
      return { ventureId, stage: "research", summary: "Research stage completed in lab" };
    case "CEO_DECISION_CREATED":
      return {
        ventureId,
        decisionId: `dec_${Date.now()}`,
        title: "Proceed to board review",
        recommendation: "approve_with_conditions",
        confidence: 0.82,
      };
    case "BOARD_CONSENSUS_REACHED":
      return {
        ventureId,
        consensusId: `con_${Date.now()}`,
        level: "unanimous",
        finalDecision: "proceed_to_build_plan",
        confidence: 0.91,
      };
    case "RISK_DETECTED":
      return {
        ventureId,
        riskId: `risk_${Date.now()}`,
        severity: "critical",
        title: "Regulatory compliance gap",
        description: "Mock critical risk for P0 heuristic",
      };
    case "OPPORTUNITY_DETECTED":
      return {
        ventureId,
        opportunityId: `opp_${Date.now()}`,
        impact: "medium",
        title: "EV fleet subsidy window",
        description: "Mock opportunity for scheduler lab",
      };
    case "MEMORY_UPDATED":
      return {
        ventureId,
        memoryId: `mem_${Date.now()}`,
        memoryType: "executive_decision",
        action: "created",
      };
    default:
      return { ventureId } as PublishInput<RuntimeEventType>["payload"];
  }
}

export function createRuntimeSchedulerLab(
  ventureId = LAB_MOCK_VENTURE_ID,
): RuntimeSchedulerLabSession {
  const bus = createRuntimeEventBus();
  const scheduler = connectSchedulerToEventBus(createRuntimeScheduler(), bus);

  return {
    scheduler,
    ventureId,
    publishMockEvent(type: RuntimeEventType): void {
      bus.publish({
        type,
        source: "runtime-scheduler-lab",
        payload: buildMockPayload(type, ventureId),
      } as PublishInput<RuntimeEventType>);
    },
    getSnapshot(): SchedulerSnapshot {
      return scheduler.getSnapshot(ventureId);
    },
    reset(): void {
      scheduler.disconnect();
      scheduler.clear();
      bus.clear();
    },
  };
}

/** Run a canonical demo sequence for the lab UI. */
export function runSchedulerDemoSequence(session: RuntimeSchedulerLabSession): SchedulerSnapshot {
  const sequence: RuntimeEventType[] = [
    "VENTURE_CREATED",
    "DISCOVERY_COMPLETED",
    "RESEARCH_COMPLETED",
    "CEO_DECISION_CREATED",
    "BOARD_CONSENSUS_REACHED",
    "RISK_DETECTED",
    "OPPORTUNITY_DETECTED",
    "MEMORY_UPDATED",
  ];

  for (const type of sequence) {
    session.publishMockEvent(type);
  }

  return session.getSnapshot();
}
