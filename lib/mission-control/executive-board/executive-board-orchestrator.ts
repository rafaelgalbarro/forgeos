/** PROGRAM 5400 — Executive Board orchestrator (trigger → reviews → summary). */

import type { Mission } from "../types";
import { BOARD_DEPARTMENT_IDS } from "./board-participants";
import { primaryBoardTrigger, shouldTriggerExecutiveBoard } from "./board-trigger";
import { collectDepartmentReviews } from "./department-review";
import {
  formatExecutiveSummaryForCeo,
  synthesizeExecutiveSummary,
} from "./executive-summary-synthesizer";
import type {
  ExecutiveBoardResult,
  ExecutiveBoardSession,
  ExecutiveBoardStatus,
} from "./types";

function sessionId(): string {
  return `board-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createReviewingSession(mission: Mission, userInput?: string): ExecutiveBoardSession | null {
  if (!shouldTriggerExecutiveBoard(mission, userInput)) return null;
  const trigger = primaryBoardTrigger(mission, userInput);
  if (!trigger) return null;

  return {
    id: sessionId(),
    status: "reviewing",
    trigger,
    reviews: [],
    activeDepartments: [...BOARD_DEPARTMENT_IDS],
    startedAt: new Date().toISOString(),
  };
}

export async function runExecutiveBoardReview(
  mission: Mission,
  userInput?: string,
  existingSession?: ExecutiveBoardSession
): Promise<ExecutiveBoardResult> {
  const trigger = primaryBoardTrigger(mission, userInput);
  if (!trigger) {
    return {
      session: idleSession(),
      shouldShow: false,
    };
  }

  const session: ExecutiveBoardSession = existingSession ?? {
    id: sessionId(),
    status: "reviewing" as ExecutiveBoardStatus,
    trigger,
    reviews: [],
    activeDepartments: [...BOARD_DEPARTMENT_IDS],
    startedAt: new Date().toISOString(),
  };

  const reviews = await collectDepartmentReviews(mission, trigger);
  const summary = synthesizeExecutiveSummary(reviews, trigger);

  const completed: ExecutiveBoardSession = {
    ...session,
    status: "ready",
    reviews,
    summary,
    activeDepartments: [],
    completedAt: new Date().toISOString(),
  };

  return {
    session: completed,
    shouldShow: true,
    ceoInjection: formatExecutiveSummaryForCeo(summary),
  };
}

export function attachExecutiveBoardToMission(
  mission: Mission,
  session: ExecutiveBoardSession
): Mission {
  return {
    ...mission,
    executiveBoard: session,
    status: {
      ...mission.status,
      confidence: session.summary
        ? Math.round((mission.status.confidence + session.summary.confidence) / 2)
        : mission.status.confidence,
      executiveCouncil: session.summary
        ? {
            visible: true,
            headline: session.summary.headline,
            summary: session.summary.finalRecommendation,
            departments: session.reviews.map((r) => r.department),
            confidence: session.summary.confidence,
          }
        : mission.status.executiveCouncil,
    },
    updatedAt: new Date().toISOString(),
  };
}

function idleSession(): ExecutiveBoardSession {
  return {
    id: "board-idle",
    status: "idle",
    trigger: { reason: "user_requested", label: "Sin revisión activa" },
    reviews: [],
    activeDepartments: [],
    startedAt: new Date().toISOString(),
  };
}

export { shouldTriggerExecutiveBoard, primaryBoardTrigger };
