import type { RoadmapFeedbackSummary } from "./types";
import {
  listRoadmapWithVotes,
  getRoadmapVoteCount,
} from "@/lib/design-partners/roadmap-voting";

export { listRoadmapWithVotes, getRoadmapVoteCount };

export function getRoadmapFeedbackSummary(): RoadmapFeedbackSummary {
  const items = listRoadmapWithVotes();
  const topItems = items
    .sort((a, b) => b.voteCount - a.voteCount)
    .slice(0, 5)
    .map((i) => ({
      id: i.id,
      title: i.title,
      votes: i.voteCount,
      quarter: i.quarter,
    }));

  return {
    totalVotes: getRoadmapVoteCount(),
    topItems,
  };
}
