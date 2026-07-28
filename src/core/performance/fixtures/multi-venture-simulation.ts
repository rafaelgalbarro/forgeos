/**
 * PROGRAM 6100 — Multi-venture simulation fixtures.
 */

import { buildVentureCardProjection } from "../projections/venture-card-projection";
import type { VentureCardProjection } from "../projections/venture-card-projection";

export function createVentureSummaryFixtures(count: 1 | 5 | 10 | 25 | 100): VentureCardProjection[] {
  const cards: VentureCardProjection[] = [];
  for (let i = 0; i < count; i++) {
    cards.push(
      buildVentureCardProjection({
        ventureId: `venture-sim-${i}`,
        workspaceId: "ws-sim",
        name: `Sim Venture ${i + 1}`,
        lifecycle: i % 3 === 0 ? "ACTIVE" : i % 3 === 1 ? "DRAFT" : "PAUSED",
        missionCount: (i % 5) + 1,
        activeMissions: i % 4,
        health: i % 7 === 0 ? "BLOCKED" : i % 5 === 0 ? "AT_RISK" : "HEALTHY",
      }),
    );
  }
  return cards;
}

export interface ConcurrentMissionScenario {
  missions: Array<{
    missionId: string;
    ventureId: string;
    priority: "INTERACTIVE" | "STANDARD" | "BACKGROUND";
    shouldFail: boolean;
    paused: boolean;
  }>;
}

export const THREE_CONCURRENT_MISSIONS: ConcurrentMissionScenario = {
  missions: [
    { missionId: "mission-a", ventureId: "venture-1", priority: "INTERACTIVE", shouldFail: false, paused: false },
    { missionId: "mission-b", ventureId: "venture-2", priority: "STANDARD", shouldFail: true, paused: false },
    { missionId: "mission-c", ventureId: "venture-3", priority: "BACKGROUND", shouldFail: false, paused: true },
  ],
};
