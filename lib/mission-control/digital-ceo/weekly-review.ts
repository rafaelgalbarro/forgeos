/** Week-over-week progress from timeline + checkpoints. */

import type { Mission, MissionPhase } from "../types";
import type { WeeklyReview } from "./types";
import { lastMondayDateKey } from "./digital-ceo-persistence";
import { MISSION_PHASE_ORDER } from "../mission-flow";

function weekBounds(ref = new Date()): { start: string; end: string } {
  const monday = lastMondayDateKey(ref);
  const end = new Date(ref).toISOString().slice(0, 10);
  return { start: monday, end };
}

function eventsSince(mission: Mission, sinceDate: string) {
  const since = new Date(sinceDate).getTime();
  return mission.timeline.filter((e) => new Date(e.timestamp).getTime() >= since);
}

function phaseAtWeekStart(mission: Mission, weekStart: string): MissionPhase | null {
  const since = new Date(weekStart).getTime();
  const before = mission.timeline.filter((e) => new Date(e.timestamp).getTime() < since);
  const lastPhaseEvent = [...before].reverse().find((e) => e.phase);
  return lastPhaseEvent?.phase ?? mission.phase;
}

function progressFromSnapshots(mission: Mission): number {
  if (!mission.snapshots.length) return 0;
  return Math.round(
    mission.snapshots.reduce((sum, s) => sum + s.progress, 0) / mission.snapshots.length
  );
}

export function generateWeeklyReview(mission: Mission): WeeklyReview {
  const { start, end } = weekBounds();
  const weekEvents = eventsSince(mission, start);
  const phaseStart = phaseAtWeekStart(mission, start);

  const wins = weekEvents
    .filter((e) => e.icon === "✅" || e.label.toLowerCase().includes("complet"))
    .map((e) => e.label)
    .slice(0, 5);

  const blockers = weekEvents
    .filter(
      (e) =>
        e.label.toLowerCase().includes("riesgo") ||
        e.label.toLowerCase().includes("bloque") ||
        e.label.toLowerCase().includes("pausa")
    )
    .map((e) => e.label)
    .slice(0, 5);

  if (blockers.length === 0 && mission.autoPilot.pausedForDecision) {
    blockers.push("Auto-pilot pausado por decisión pendiente");
  }

  const currentProgress = progressFromSnapshots(mission);
  const startIdx = phaseStart ? MISSION_PHASE_ORDER.indexOf(phaseStart) : 0;
  const endIdx = MISSION_PHASE_ORDER.indexOf(mission.phase);
  const progressDelta = Math.max(0, (endIdx - startIdx) * 15 + Math.min(20, weekEvents.length * 2));

  return {
    weekStart: start,
    weekEnd: end,
    progressDelta: Math.min(100, progressDelta || currentProgress),
    wins: wins.length ? wins : ["Sin victorias registradas esta semana — buen momento para cerrar un hito"],
    blockers: blockers.length ? blockers : ["Sin bloqueadores críticos en timeline"],
    eventsCount: weekEvents.length,
    phaseAtWeekStart: phaseStart,
    currentPhase: mission.phase,
    generatedAt: new Date().toISOString(),
  };
}

export function formatWeeklyReviewText(review: WeeklyReview): string {
  const wins = review.wins.map((w) => `✓ ${w}`).join("\n");
  const blockers = review.blockers.map((b) => `⚠ ${b}`).join("\n");
  return `Semana ${review.weekStart} → ${review.weekEnd}\nProgreso: +${review.progressDelta}%\n\nVictorias:\n${wins}\n\nBloqueos:\n${blockers}`;
}
