/** Unified activity feed aggregator. */

import type { FeedItem } from "./types";
import { appendResearchEvent } from "./research-feed";
import { appendBuildEvent } from "./build-feed";
import { appendDeploymentEvent } from "./deployment-feed";

export interface MissionFeeds {
  researchFeed: FeedItem[];
  buildFeed: FeedItem[];
  deploymentFeed: FeedItem[];
}

export function routeFeedEvent(
  feeds: MissionFeeds,
  source: FeedItem["source"],
  label: string,
  status?: FeedItem["status"]
): MissionFeeds {
  switch (source) {
    case "research":
      return { ...feeds, researchFeed: appendResearchEvent(feeds.researchFeed, label, status) };
    case "build":
      return { ...feeds, buildFeed: appendBuildEvent(feeds.buildFeed, label, status) };
    case "deployment":
      return { ...feeds, deploymentFeed: appendDeploymentEvent(feeds.deploymentFeed, label, status) };
    default:
      return feeds;
  }
}

export function allFeedItems(feeds: MissionFeeds): FeedItem[] {
  return [...feeds.researchFeed, ...feeds.buildFeed, ...feeds.deploymentFeed].sort((a, b) =>
    b.timestamp.localeCompare(a.timestamp)
  );
}
