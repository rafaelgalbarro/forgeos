import type { FeedbackInboxItem } from "./types";
import { listBetaFeedback } from "@/lib/beta-platform/feedback";
import { listIssueReports } from "./issue-reporting";
import { listFeatureRequests } from "./feature-requests";
import { listNpsResponses } from "./success-dashboard";

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Bug",
  feature: "Feature",
  general: "General",
  ux: "UX",
  performance: "Rendimiento",
};

export function listFeedbackInbox(): FeedbackInboxItem[] {
  const beta = listBetaFeedback().map(
    (f): FeedbackInboxItem => ({
      id: f.id,
      source: "beta",
      title: CATEGORY_LABELS[f.category] ?? f.category,
      message: f.message,
      category: f.category,
      page: f.page,
      rating: f.rating,
      createdAt: f.createdAt,
    })
  );

  const issues = listIssueReports().map(
    (i): FeedbackInboxItem => ({
      id: i.id,
      source: "issue",
      title: i.title,
      message: i.description,
      severity: i.severity,
      status: i.status,
      page: i.page,
      createdAt: i.createdAt,
    })
  );

  const features = listFeatureRequests().map(
    (f): FeedbackInboxItem => ({
      id: f.id,
      source: "feature",
      title: f.title,
      message: f.description,
      status: f.status,
      createdAt: f.createdAt,
    })
  );

  const nps = listNpsResponses().map(
    (n): FeedbackInboxItem => ({
      id: n.id,
      source: "nps",
      title: `NPS ${n.score}/10`,
      message: n.comment ?? "Sin comentario",
      rating: n.score,
      createdAt: n.createdAt,
    })
  );

  return [...beta, ...issues, ...features, ...nps].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getFeedbackInboxCount(): number {
  return listFeedbackInbox().length;
}

export function getFeedbackInboxBySource(source: FeedbackInboxItem["source"]): FeedbackInboxItem[] {
  return listFeedbackInbox().filter((i) => i.source === source);
}
