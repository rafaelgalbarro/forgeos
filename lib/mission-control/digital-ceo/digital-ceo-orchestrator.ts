/** PROGRAM 6000 — Digital CEO main coordinator. */

import type { Mission } from "../types";
import type { ProactiveCEOState } from "./types";
import { composeAllBriefs, buildOpeningMessage } from "./brief-generator";
import {
  readDigitalCEOState,
  writeDigitalCEOState,
  todayDateKey,
  lastMondayDateKey,
  isMorningBriefStale,
} from "./digital-ceo-persistence";
import { getAiRuntimeHints } from "../adapters/ai-runtime-adapter";
import { buildDigitalCEOSnapshotFromState } from "./digital-ceo-snapshots";

export async function generateDigitalCEOBriefs(mission: Mission): Promise<ProactiveCEOState> {
  await getAiRuntimeHints();
  const briefs = composeAllBriefs(mission);
  const today = todayDateKey();

  const state: ProactiveCEOState = {
    missionId: mission.id,
    briefs,
    openingMessage: buildOpeningMessage(briefs),
    lastMorningBriefDate: today,
    lastWeeklyReviewDate: lastMondayDateKey(),
    openingInjectedAt: null,
    dismissed: false,
    generatedAt: new Date().toISOString(),
  };

  writeDigitalCEOState(state);
  return state;
}

export function refreshDigitalCEOState(mission: Mission, prior: ProactiveCEOState | null): ProactiveCEOState {
  const staleMorning = isMorningBriefStale(prior);
  if (!staleMorning && prior?.briefs) {
    return {
      ...prior,
      briefs: {
        ...prior.briefs,
        missionBrief: composeAllBriefs(mission).missionBrief,
        dailyPriorities: composeAllBriefs(mission).dailyPriorities,
      },
      generatedAt: new Date().toISOString(),
    };
  }
  const briefs = composeAllBriefs(mission);
  const state: ProactiveCEOState = {
    missionId: mission.id,
    briefs,
    openingMessage: buildOpeningMessage(briefs),
    lastMorningBriefDate: todayDateKey(),
    lastWeeklyReviewDate: lastMondayDateKey(),
    openingInjectedAt: prior?.openingInjectedAt ?? null,
    dismissed: prior?.dismissed ?? false,
    generatedAt: new Date().toISOString(),
  };
  writeDigitalCEOState(state);
  return state;
}

export function dismissDigitalCEO(state: ProactiveCEOState): ProactiveCEOState {
  const next = { ...state, dismissed: true };
  writeDigitalCEOState(next);
  return next;
}

export function getDigitalCEOSnapshotForMission(missionId: string): ReturnType<typeof buildDigitalCEOSnapshotFromState> {
  const state = readDigitalCEOState(missionId);
  const today = todayDateKey();
  const hasMorning = state?.lastMorningBriefDate === today;
  const ready = state?.briefs ? 6 : 0;
  return buildDigitalCEOSnapshotFromState(missionId, hasMorning, ready);
}
