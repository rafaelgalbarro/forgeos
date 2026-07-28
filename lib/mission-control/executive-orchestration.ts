/** Executive orchestration — delegates to Executive Board (PROGRAM 5400). */

import type { ExecutiveCouncilSummary, Mission } from "./types";
import {
  runExecutiveBoardReview,
  attachExecutiveBoardToMission,
  shouldTriggerExecutiveBoard,
  createReviewingSession,
} from "./executive-board/executive-board-orchestrator";
import {
  emitExecutiveBoardReviewing,
  emitExecutiveSummaryReady,
  emitBoardEventToMission,
} from "./live-mission/event-emitter";
import { timelineForBoardReviewStart, timelineForBoardSummaryReady } from "./mission-timeline";

export function shouldShowExecutiveCouncil(mission: Mission, userInput?: string): boolean {
  return shouldTriggerExecutiveBoard(mission, userInput);
}

export async function fetchExecutiveSummary(mission: Mission, userInput?: string): Promise<ExecutiveCouncilSummary> {
  const result = await runExecutiveBoardReview(mission, userInput);
  if (!result.shouldShow || !result.session.summary) {
    return buildFallbackCouncilSummary(mission);
  }

  const s = result.session.summary;
  return {
    visible: true,
    headline: s.headline,
    summary: s.finalRecommendation,
    departments: result.session.reviews.map((r) => r.department),
    confidence: s.confidence,
  };
}

export async function runExecutiveBoardForMission(
  mission: Mission,
  userInput?: string
): Promise<{ mission: Mission; council: ExecutiveCouncilSummary; ceoInjection?: string }> {
  const reviewing = createReviewingSession(mission, userInput);
  let m = mission;

  if (reviewing) {
    m = attachExecutiveBoardToMission(m, reviewing);
    m = timelineForBoardReviewStart(m, reviewing.trigger.label);
    m = emitBoardEventToMission(m, reviewing, false);
    emitExecutiveBoardReviewing(reviewing);
  }

  const result = await runExecutiveBoardReview(m, userInput, reviewing ?? undefined);
  if (!result.shouldShow) {
    const council = buildFallbackCouncilSummary(mission);
    return { mission, council };
  }

  m = attachExecutiveBoardToMission(m, result.session);
  m = timelineForBoardSummaryReady(m, result.session.summary!.confidence);
  m = emitBoardEventToMission(m, result.session, true);
  emitExecutiveSummaryReady(result.session);

  const council: ExecutiveCouncilSummary = {
    visible: true,
    headline: result.session.summary!.headline,
    summary: result.session.summary!.finalRecommendation,
    departments: result.session.reviews.map((r) => r.department),
    confidence: result.session.summary!.confidence,
  };

  return { mission: m, council, ceoInjection: result.ceoInjection };
}

export function buildFallbackCouncilSummary(mission: Mission): ExecutiveCouncilSummary {
  const departments = mission.status.activeDepartments.length
    ? mission.status.activeDepartments.slice(0, 7)
    : ["CEO", "CTO", "CFO", "CMO", "Legal", "Research", "QA"];

  return {
    visible: shouldShowExecutiveCouncil(mission),
    headline: "Consejo evaluando…",
    summary: `El consejo ejecutivo revisa tu misión "${mission.title}". Sin cadena de pensamiento expuesta — solo recomendación final.`,
    departments,
    confidence: mission.status.confidence,
  };
}

export function attachExecutiveCouncil(mission: Mission, council: ExecutiveCouncilSummary): Mission {
  return {
    ...mission,
    status: {
      ...mission.status,
      executiveCouncil: council,
      confidence: Math.round((mission.status.confidence + council.confidence) / 2),
    },
  };
}

export function executiveBannerMessage(council: ExecutiveCouncilSummary): string {
  return `${council.headline} ${council.summary}`;
}

export function injectExecutiveSummaryIntoReply(reply: string, injection: string): string {
  return `${reply}\n\n---\n${injection}`;
}
