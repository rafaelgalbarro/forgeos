import type { IdeasPortalSummary } from "./types";
import {
  listFeatureRequests,
  getFeatureRequestCount,
  submitFeatureRequest,
  upvoteFeatureRequest,
} from "@/lib/design-partners/feature-requests";

export { listFeatureRequests, getFeatureRequestCount, submitFeatureRequest, upvoteFeatureRequest };

export function getIdeasPortalSummary(): IdeasPortalSummary {
  const ideas = listFeatureRequests();
  return {
    totalIdeas: ideas.length,
    submitted: ideas.filter((i) => i.status === "submitted").length,
    planned: ideas.filter((i) => i.status === "planned" || i.status === "reviewing").length,
    shipped: ideas.filter((i) => i.status === "shipped").length,
    topIdeas: ideas.slice(0, 5).map((i) => ({
      id: i.id,
      title: i.title,
      votes: i.votes,
      status: i.status,
    })),
  };
}
