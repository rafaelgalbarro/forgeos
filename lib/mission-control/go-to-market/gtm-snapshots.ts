/** Lightweight GTM snapshot for SSR and Mission Control panels. */

import type { GTMDeliverableId, GTMPackage, GTMSnapshot, GTMDeliverableStatus } from "./types";
import { GTM_DELIVERABLE_LABELS } from "./types";

const ALL_DELIVERABLES: GTMDeliverableId[] = [
  "launchPlan",
  "contentCalendar",
  "linkedInPlan",
  "emailCampaigns",
  "productHunt",
  "pressKit",
  "websiteReview",
  "onboardingChecklist",
];

export function buildEmptyGTMSnapshot(missionId: string): GTMSnapshot {
  return {
    missionId,
    generatedAt: null,
    contextHash: "",
    deliverableCount: ALL_DELIVERABLES.length,
    readyCount: 0,
    deliverables: ALL_DELIVERABLES.map((id) => ({
      id,
      label: GTM_DELIVERABLE_LABELS[id],
      status: "pending" as GTMDeliverableStatus,
    })),
  };
}

export function buildGTMSnapshotFromPackage(pkg: GTMPackage): GTMSnapshot {
  const deliverables = ALL_DELIVERABLES.map((id) => ({
    id,
    label: GTM_DELIVERABLE_LABELS[id],
    status: pkg.deliverableStatus[id] ?? "ready",
  }));
  const readyCount = deliverables.filter((d) => d.status === "ready").length;

  return {
    missionId: pkg.missionId,
    generatedAt: pkg.generatedAt,
    contextHash: pkg.contextHash,
    deliverableCount: ALL_DELIVERABLES.length,
    readyCount,
    deliverables,
  };
}

export function gtmSnapshotSummary(snapshot: GTMSnapshot): string {
  if (!snapshot.generatedAt) return "GTM pendiente de generación";
  return `${snapshot.readyCount}/${snapshot.deliverableCount} entregables listos`;
}
