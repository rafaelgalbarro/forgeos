/** PROGRAM 5400 — Detect when a decision requires Executive Board review. */

import type { Mission } from "../types";
import type { BoardTriggerContext, BoardTriggerReason } from "./types";

const EXECUTIVE_REVIEW_PATTERNS =
  /consejo|ejecutiv|board|revisi[oó]n ejecutiva|executive review|evaluar alternativas/i;

const IMPORTANT_CATEGORIES = new Set(["PRICING", "ARCHITECTURE", "DEPLOYMENT"]);

export function detectBoardTriggers(mission: Mission, userInput?: string): BoardTriggerContext[] {
  const triggers: BoardTriggerContext[] = [];

  if (mission.phase === "VALIDATE") {
    triggers.push({ reason: "phase_validate", label: "Fase VALIDATE", phase: mission.phase });
  }
  if (mission.phase === "DEPLOY") {
    triggers.push({ reason: "phase_deploy", label: "Fase DEPLOY", phase: mission.phase });
  }

  for (const d of mission.pendingDecisions) {
    if (!IMPORTANT_CATEGORIES.has(d.category)) continue;
    if (d.resolved) continue;
    const reason = categoryToReason(d.category);
    triggers.push({
      reason,
      label: `Decisión: ${d.title}`,
      phase: mission.phase,
      decision: d,
    });
  }

  for (const d of mission.pendingDecisions.filter((x) => x.resolved && IMPORTANT_CATEGORIES.has(x.category))) {
    const reason = categoryToReason(d.category);
    triggers.push({
      reason,
      label: `Decisión resuelta: ${d.title}`,
      phase: mission.phase,
      decision: d,
    });
  }

  if (mission.autoPilot.pausedForDecision && mission.autoPilot.enabled) {
    triggers.push({
      reason: "auto_pilot_approval",
      label: "Auto Pilot solicita aprobación",
      phase: mission.phase,
    });
  }

  if (userInput && EXECUTIVE_REVIEW_PATTERNS.test(userInput)) {
    triggers.push({
      reason: "user_requested",
      label: "Revisión ejecutiva solicitada",
      phase: mission.phase,
    });
  }

  if (hasPairFounderHighRisk(mission)) {
    triggers.push({
      reason: "pair_founder_high_risk",
      label: "Riesgo alto detectado (Pair Founder)",
      phase: mission.phase,
    });
  }

  if (hasContradictionSignal(mission)) {
    triggers.push({
      reason: "contradiction",
      label: "Contradicción detectada en contexto",
      phase: mission.phase,
    });
  }

  return dedupeTriggers(triggers);
}

export function shouldTriggerExecutiveBoard(mission: Mission, userInput?: string): boolean {
  if (mission.intention === "DISCOVERY") return false;
  return detectBoardTriggers(mission, userInput).length > 0;
}

export function primaryBoardTrigger(mission: Mission, userInput?: string): BoardTriggerContext | undefined {
  const triggers = detectBoardTriggers(mission, userInput);
  if (!triggers.length) return undefined;
  const priority: BoardTriggerReason[] = [
    "user_requested",
    "pair_founder_high_risk",
    "contradiction",
    "decision_architecture",
    "decision_deployment",
    "decision_pricing",
    "phase_deploy",
    "phase_validate",
    "auto_pilot_approval",
  ];
  for (const p of priority) {
    const match = triggers.find((t) => t.reason === p);
    if (match) return match;
  }
  return triggers[0];
}

function categoryToReason(category: string): BoardTriggerReason {
  if (category === "PRICING") return "decision_pricing";
  if (category === "ARCHITECTURE") return "decision_architecture";
  return "decision_deployment";
}

function hasPairFounderHighRisk(mission: Mission): boolean {
  return mission.status.risks.some((r) => /\[high\]|\[critical\]/i.test(r));
}

function hasContradictionSignal(mission: Mission): boolean {
  const corpus = mission.messages
    .slice(-6)
    .map((m) => m.content)
    .join(" ");
  return /contradic|desalineaci|conflicto entre/i.test(corpus);
}

function dedupeTriggers(triggers: BoardTriggerContext[]): BoardTriggerContext[] {
  const seen = new Set<BoardTriggerReason>();
  return triggers.filter((t) => {
    if (seen.has(t.reason)) return false;
    seen.add(t.reason);
    return true;
  });
}
