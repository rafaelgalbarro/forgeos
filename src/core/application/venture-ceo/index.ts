import type { CEOMode } from "../../domain/venture-ceo";
import { getCEOSourcesForPortfolio } from "./query";
import {
  approveCEORecommendation,
  executeApprovedCEOAction,
  generateCEOBrief,
  generateCEORecommendations,
  getCEOBrief,
  getCEODecisionHistory,
  getCEOPendingApprovals,
  getCEORecommendations,
  getCEOWhatChanged,
  rejectCEORecommendation,
  setCEOMode,
} from "./service";

export async function GenerateCEOBrief(portfolioId: string) {
  const sources = await getCEOSourcesForPortfolio(portfolioId);
  if (!sources) return null;
  return generateCEOBrief(portfolioId, sources);
}

export async function GenerateCEORecommendations(portfolioId: string) {
  const sources = await getCEOSourcesForPortfolio(portfolioId);
  if (!sources) return null;
  return generateCEORecommendations(portfolioId, sources);
}

export function ApproveCEORecommendation(portfolioId: string, recommendationId: string) {
  return approveCEORecommendation(portfolioId, recommendationId);
}

export function RejectCEORecommendation(portfolioId: string, recommendationId: string) {
  return rejectCEORecommendation(portfolioId, recommendationId);
}

export function SetCEOMode(mode: CEOMode) {
  return setCEOMode(mode);
}

export function ExecuteApprovedCEOAction(portfolioId: string, recommendationId: string) {
  return executeApprovedCEOAction(portfolioId, recommendationId);
}

export function GetCEOBrief(portfolioId: string) {
  return getCEOBrief(portfolioId);
}

export function GetCEORecommendations(portfolioId: string) {
  return getCEORecommendations(portfolioId);
}

export function GetCEOPendingApprovals(portfolioId: string) {
  return getCEOPendingApprovals(portfolioId);
}

export function GetCEODecisionHistory() {
  return getCEODecisionHistory();
}

export function GetCEOWhatChanged(portfolioId: string) {
  return getCEOWhatChanged(portfolioId);
}

export * from "./policy-engine";
export * from "./service";

