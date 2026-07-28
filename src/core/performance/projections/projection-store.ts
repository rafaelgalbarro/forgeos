/**
 * PROGRAM 6100 — In-memory projection store with rebuild capability.
 */

import type { MissionCardProjection } from "./mission-card-projection";
import type { VentureCardProjection } from "./venture-card-projection";
import type { CompanyHealthProjection } from "./company-health-projection";
import type { OutputStatusProjection } from "./output-status-projection";
import type { PortfolioSummaryProjection } from "./portfolio-summary-projection";
import type { WorkflowProgressProjection } from "./workflow-progress-projection";
import type { ReleaseStatusProjection } from "./release-status-projection";

const missionCards = new Map<string, MissionCardProjection>();
const ventureCards = new Map<string, VentureCardProjection>();
const companyHealth = new Map<string, CompanyHealthProjection>();
const outputStatus = new Map<string, OutputStatusProjection>();
const portfolioSummaries = new Map<string, PortfolioSummaryProjection>();
const workflowProgress = new Map<string, WorkflowProgressProjection>();
const releaseStatus = new Map<string, ReleaseStatusProjection>();

export const projectionStore = {
  missionCards,
  ventureCards,
  companyHealth,
  outputStatus,
  portfolioSummaries,
  workflowProgress,
  releaseStatus,

  upsertMissionCard(card: MissionCardProjection): void {
    missionCards.set(card.missionId, card);
  },
  upsertVentureCard(card: VentureCardProjection): void {
    ventureCards.set(card.ventureId, card);
  },
  upsertCompanyHealth(health: CompanyHealthProjection): void {
    companyHealth.set(health.ventureId, health);
  },
  upsertOutputStatus(output: OutputStatusProjection): void {
    outputStatus.set(output.outputId, output);
  },
  upsertPortfolioSummary(summary: PortfolioSummaryProjection): void {
    portfolioSummaries.set(summary.workspaceId, summary);
  },
  upsertWorkflowProgress(progress: WorkflowProgressProjection): void {
    workflowProgress.set(progress.missionId, progress);
  },
  upsertReleaseStatus(release: ReleaseStatusProjection): void {
    releaseStatus.set(release.releaseId, release);
  },

  markStale(namespace: keyof typeof projectionStore, id: string): void {
    const maps: Record<string, Map<string, { freshness: string }>> = {
      missionCards,
      ventureCards,
      companyHealth,
      outputStatus,
      portfolioSummaries,
      workflowProgress,
      releaseStatus,
    };
    const map = maps[namespace as string];
    const entry = map?.get(id);
    if (entry) entry.freshness = "STALE";
  },

  reset(): void {
    missionCards.clear();
    ventureCards.clear();
    companyHealth.clear();
    outputStatus.clear();
    portfolioSummaries.clear();
    workflowProgress.clear();
    releaseStatus.clear();
  },
};
