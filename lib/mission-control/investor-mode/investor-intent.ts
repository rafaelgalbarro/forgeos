/** PROGRAM 5800 — Investor intent detection. */

import type { Mission } from "../types";

const INVESTOR_KEYWORDS = [
  "inversión",
  "inversion",
  "investor",
  "investors",
  "funding",
  "financiación",
  "financiacion",
  "ronda",
  "capital",
  "pre-seed",
  "preseed",
  "seed",
  "venture capital",
  "vc",
  "angel",
  "data room",
  "pitch deck",
  "valoración",
  "valoracion",
  "due diligence",
];

const INVESTOR_PHASES: Mission["phase"][] = ["VALIDATE", "OPERATE", "DEPLOY", "EVOLVE"];

export function detectInvestorIntent(input: string, mission: Mission): boolean {
  const text = input.trim().toLowerCase();
  const keywordMatch = INVESTOR_KEYWORDS.some((k) => text.includes(k));
  const phaseMatch = INVESTOR_PHASES.includes(mission.phase);
  return keywordMatch || (phaseMatch && text.includes("inversor"));
}

export function shouldTriggerInvestorMode(mission: Mission, input?: string): boolean {
  if (input && detectInvestorIntent(input, mission)) return true;
  if (INVESTOR_PHASES.includes(mission.phase) && mission.snapshots.find((s) => s.id === "investorReadiness")?.progress === 0) {
    return false;
  }
  return false;
}

export function investorIntentReply(score: number): string {
  return `Modo inversor activado. He generado 8 deliverables de inversión. Readiness Score: ${score}%. Revisa el panel Investor Mode.`;
}
