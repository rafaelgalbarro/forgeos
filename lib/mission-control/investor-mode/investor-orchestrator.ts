/** PROGRAM 5800 — Investor package orchestrator. */

import type { InvestorPackage } from "./types";
import type { Mission } from "../types";
import { INVESTOR_MODE_VERSION } from "./types";
import { fetchVentureIntelligenceContext } from "./adapters/venture-intelligence-adapter";
import { generateDataRoom } from "./data-room-generator";
import { generateInvestorDeck } from "./investor-deck-generator";
import { generateFinancialModel } from "./financial-model-generator";
import { generateValuationSummary } from "./valuation-summary-generator";
import { generateDueDiligenceChecklist } from "./due-diligence-checklist";
import { generateInvestorFAQ } from "./investor-faq-generator";
import { generateFundingPlan } from "./funding-plan-generator";
import { computeInvestorReadinessScore } from "./investor-readiness-scorer";

const STORAGE_PREFIX = "forgeos-investor-";

function storageKey(missionId: string): string {
  return `${STORAGE_PREFIX}${missionId}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function readInvestorPackage(missionId: string): InvestorPackage | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(storageKey(missionId));
    if (!raw) return null;
    return JSON.parse(raw) as InvestorPackage;
  } catch {
    return null;
  }
}

export function writeInvestorPackage(pkg: InvestorPackage): void {
  if (!isBrowser()) return;
  localStorage.setItem(storageKey(pkg.missionId), JSON.stringify(pkg));
}

export async function generateInvestorPackage(mission: Mission): Promise<InvestorPackage> {
  const ctx = await fetchVentureIntelligenceContext(mission);

  const dataRoom = generateDataRoom(mission, ctx);
  const deck = generateInvestorDeck(mission, ctx);
  const financialModel = generateFinancialModel(ctx);
  const valuation = generateValuationSummary(ctx);
  const dueDiligence = generateDueDiligenceChecklist(mission, ctx);
  const faq = generateInvestorFAQ(mission, ctx);
  const fundingPlan = generateFundingPlan(ctx);
  const readiness = computeInvestorReadinessScore(
    dataRoom,
    deck,
    financialModel,
    valuation,
    dueDiligence,
    faq,
    fundingPlan,
    ctx
  );

  const pkg: InvestorPackage = {
    missionId: mission.id,
    ventureName: ctx.ventureName,
    generatedAt: new Date().toISOString(),
    version: INVESTOR_MODE_VERSION,
    dataRoom,
    deck,
    financialModel,
    valuation,
    dueDiligence,
    faq,
    fundingPlan,
    readiness,
  };

  writeInvestorPackage(pkg);
  return pkg;
}

export function updateMissionInvestorSnapshot(mission: Mission, score: number): Mission {
  const snapshots = mission.snapshots.map((s) =>
    s.id === "investorReadiness"
      ? {
          ...s,
          progress: score,
          status: score >= 80 ? ("completed" as const) : score >= 30 ? ("in_progress" as const) : s.status,
          summary: `Readiness Score: ${score}%`,
        }
      : s
  );
  return { ...mission, snapshots, updatedAt: new Date().toISOString() };
}
