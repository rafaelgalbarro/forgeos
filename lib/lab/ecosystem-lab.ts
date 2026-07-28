/** RC9 — Ecosystem Lab harness. */

import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";
import {
  getAllEcosystemPacks,
  getCombinedMarketplaceStats,
  searchCrmPacks,
  searchEcosystemPacks,
} from "@/lib/ecosystem/marketplace-engine";
import { getCreatorEconomyStats, listCreatorListings } from "@/lib/ecosystem/creator-economy";
import { resolvePackDependencies } from "@/lib/ecosystem/dependency-resolver";
import { runCrmDemoInstall } from "@/lib/ecosystem/installation-engine";
import { listPlugins } from "@/lib/ecosystem/plugin-engine";
import { listSdkModules } from "@/lib/ecosystem/sdk-engine";
import { computeQualityScore } from "@/lib/ecosystem/quality-score";
import { getReviewsForPack } from "@/lib/ecosystem/review-engine";
import { getCrmDemoPack } from "@/lib/ecosystem/catalog";
import type { EcosystemPack, InstallSimulationResult } from "@/lib/ecosystem/types";

export interface EcosystemLabSnapshot {
  ventureId: string;
  stats: ReturnType<typeof getCombinedMarketplaceStats>;
  crmPacks: EcosystemPack[];
  crmPack: EcosystemPack;
  crmDependencies: ReturnType<typeof resolvePackDependencies>;
  crmInstallResult: InstallSimulationResult;
  plugins: ReturnType<typeof listPlugins>;
  sdkModules: ReturnType<typeof listSdkModules>;
  creatorStats: ReturnType<typeof getCreatorEconomyStats>;
  creatorListings: ReturnType<typeof listCreatorListings>;
  totalPacks: number;
  crmReviews: ReturnType<typeof getReviewsForPack>;
  crmQuality: ReturnType<typeof computeQualityScore>;
}

export async function runEcosystemLab(
  ventureId = LAB_MOCK_VENTURE_ID
): Promise<EcosystemLabSnapshot> {
  const crmPack = getCrmDemoPack();
  const crmInstallResult = runCrmDemoInstall(ventureId);

  return {
    ventureId,
    stats: getCombinedMarketplaceStats(),
    crmPacks: searchCrmPacks(),
    crmPack,
    crmDependencies: resolvePackDependencies(crmPack.id),
    crmInstallResult,
    plugins: listPlugins(),
    sdkModules: listSdkModules(),
    creatorStats: getCreatorEconomyStats(),
    creatorListings: listCreatorListings(),
    totalPacks: getAllEcosystemPacks().length,
    crmReviews: getReviewsForPack(crmPack.id),
    crmQuality: computeQualityScore(crmPack.id),
  };
}

export function getEcosystemLabState(ventureId = LAB_MOCK_VENTURE_ID): EcosystemLabSnapshot {
  const crmPack = getCrmDemoPack();
  return {
    ventureId,
    stats: getCombinedMarketplaceStats(),
    crmPacks: searchEcosystemPacks({ query: "CRM" }).packs,
    crmPack,
    crmDependencies: resolvePackDependencies(crmPack.id),
    crmInstallResult: runCrmDemoInstall(ventureId),
    plugins: listPlugins(),
    sdkModules: listSdkModules(),
    creatorStats: getCreatorEconomyStats(),
    creatorListings: listCreatorListings(),
    totalPacks: getAllEcosystemPacks().length,
    crmReviews: getReviewsForPack(crmPack.id),
    crmQuality: computeQualityScore(crmPack.id),
  };
}
