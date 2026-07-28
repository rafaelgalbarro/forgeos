/** Thin adapter — Customer Success public API (Program 8000). */

import type { FeedbackItem, KPISnapshot, NPSData, ProductMetricsSnapshot, RoadmapItem } from "../types";

export async function fetchNpsSnapshot(): Promise<NPSData> {
  const { getNpsScore, getNpsBreakdown, listNpsResponses } = await import("@/lib/customer-success");
  const nps = getNpsScore();
  const breakdown = getNpsBreakdown(listNpsResponses());
  return {
    score: nps.score,
    promoters: breakdown.promoters,
    passives: breakdown.passives,
    detractors: breakdown.detractors,
    responseCount: nps.responses,
    trend: nps.score >= 50 ? "up" : nps.score > 0 ? "stable" : "down",
  };
}

export async function fetchFeedbackSnapshot(): Promise<FeedbackItem[]> {
  const { listFeedbackInbox } = await import("@/lib/customer-success");
  return listFeedbackInbox().slice(0, 20).map((f) => ({
    id: f.id,
    title: f.title,
    message: f.message,
    source: f.source === "beta" ? "beta" : f.source === "issue" ? "design-partner" : f.source,
    createdAt: f.createdAt,
    rating: f.rating,
  }));
}

export async function fetchKpiSnapshot(): Promise<KPISnapshot[]> {
  const { getCustomerSuccessSnapshot } = await import("@/lib/customer-success");
  const snap = getCustomerSuccessSnapshot();
  return [
    {
      id: "success-score",
      label: "Success Score",
      value: snap.successScore,
      unit: "%",
      trend: snap.successScore >= 70 ? "up" : "stable",
      target: 80,
    },
    {
      id: "retention",
      label: "Retención",
      value: snap.retention.rate,
      unit: "%",
      trend: "stable",
      target: 85,
    },
    {
      id: "activation",
      label: "Activación",
      value: snap.activation.rate,
      unit: "%",
      trend: "up",
      target: 60,
    },
    {
      id: "feedback-count",
      label: "Feedback inbox",
      value: snap.feedbackCount,
      trend: snap.feedbackCount > 0 ? "up" : "stable",
    },
    {
      id: "feature-requests",
      label: "Feature requests",
      value: snap.featureRequestCount,
      trend: "stable",
    },
    {
      id: "issues",
      label: "Issues abiertos",
      value: snap.issueCount,
      trend: snap.issueCount > 3 ? "down" : "stable",
    },
  ];
}

export async function fetchProductMetricsSnapshot(): Promise<ProductMetricsSnapshot> {
  const { getProductMetrics } = await import("@/lib/customer-success");
  const m = getProductMetrics();
  return {
    totalEvents: m.totalEvents,
    dpEventCount: m.dpEventCount,
    betaEventCount: m.betaEventCount,
    topPaths: m.topPaths.slice(0, 5),
    topEvents: m.topEvents.slice(0, 5),
  };
}

export async function fetchRoadmapFromFeedback(): Promise<RoadmapItem[]> {
  const { listRoadmapWithVotes } = await import("@/lib/customer-success");
  return listRoadmapWithVotes().slice(0, 10).map((r) => ({
    id: r.id,
    title: r.title,
    quarter: r.quarter,
    status: r.status === "shipped" ? "done" : r.status === "in-progress" ? "in-progress" : "planned",
    votes: r.voteCount,
    priority: r.voteCount >= 10 ? "high" : r.voteCount >= 5 ? "medium" : "low",
  }));
}

export async function fetchCustomerSuccessHealthHint(): Promise<{ score: number; label: string }> {
  const { getCustomerSuccessSnapshot } = await import("@/lib/customer-success");
  const snap = getCustomerSuccessSnapshot();
  return { score: snap.successScore, label: snap.health?.tier ?? "unknown" };
}
