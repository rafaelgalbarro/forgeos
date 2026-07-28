/** CEO proactive initiation on project open. */

import type { Mission, MissionMessage } from "../types";
import type { ProactiveCEOState, ProactiveInitResult } from "./types";
import {
  readDigitalCEOState,
  writeDigitalCEOState,
  todayDateKey,
} from "./digital-ceo-persistence";
import { refreshDigitalCEOState } from "./digital-ceo-orchestrator";
import { emitMissionEventAsync } from "../live-mission/event-emitter";
import { appendTimelineEvent } from "../mission-timeline";

function msgId(): string {
  return `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Mission has real venture state — not first-time blank slate. */
export function isReturningMission(mission: Mission): boolean {
  if (mission.intention) return true;
  if (mission.idea && mission.idea.length > 3) return true;
  if (mission.messages.length > 0) return true;
  if (mission.timeline.length > 1) return true;
  if (mission.pendingDecisions.some((d) => !d.resolved)) return true;
  return false;
}

function alreadyInjectedToday(state: ProactiveCEOState | null): boolean {
  if (!state?.openingInjectedAt) return false;
  return state.openingInjectedAt.slice(0, 10) === todayDateKey();
}

function injectCeoOpeningMessage(mission: Mission, content: string): Mission {
  const message: MissionMessage = {
    id: msgId(),
    role: "ceo",
    content,
    timestamp: new Date().toISOString(),
    decisionPrompt: false,
  };
  let m: Mission = {
    ...mission,
    messages: [message, ...mission.messages],
    updatedAt: new Date().toISOString(),
  };
  m = appendTimelineEvent(m, "Morning Brief generado", m.phase, "☀️");
  m = emitMissionEventAsync(m, "ceo_response", "Morning Brief generado", {
    department: "CEO",
    icon: "☀️",
  });
  return m;
}

export function runProactiveSessionStart(mission: Mission): ProactiveInitResult {
  const prior = readDigitalCEOState(mission.id);

  if (!isReturningMission(mission)) {
    const empty: ProactiveCEOState = {
      missionId: mission.id,
      briefs: null,
      openingMessage: null,
      lastMorningBriefDate: null,
      lastWeeklyReviewDate: null,
      openingInjectedAt: null,
      dismissed: false,
      generatedAt: new Date().toISOString(),
    };
    return { state: empty, missionUpdated: false, injectedMessage: null };
  }

  const state = refreshDigitalCEOState(mission, prior);

  if (alreadyInjectedToday(state)) {
    return { state, missionUpdated: false, injectedMessage: null };
  }

  const opening = state.openingMessage;
  if (!opening) {
    return { state, missionUpdated: false, injectedMessage: null };
  }

  const nextState: ProactiveCEOState = {
    ...state,
    openingInjectedAt: new Date().toISOString(),
    dismissed: false,
  };
  writeDigitalCEOState(nextState);

  return {
    state: nextState,
    missionUpdated: true,
    injectedMessage: opening,
  };
}

export function applyProactiveInitToMission(mission: Mission, result: ProactiveInitResult): Mission {
  if (!result.missionUpdated || !result.injectedMessage) return mission;
  return injectCeoOpeningMessage(mission, result.injectedMessage);
}

/** Session start hook — used by conversation-engine and Mission Control shell. */
export function startMissionSession(mission: Mission): { mission: Mission; state: ProactiveCEOState } {
  const result = runProactiveSessionStart(mission);
  const updated = applyProactiveInitToMission(mission, result);
  return { mission: updated, state: result.state };
}
