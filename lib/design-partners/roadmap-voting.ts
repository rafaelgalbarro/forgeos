import type { RoadmapItemWithVotes, RoadmapVote } from "./types";
import { PUBLIC_ROADMAP } from "@/lib/launch/public-roadmap";
import { readStorage, writeStorage } from "./storage";
import { trackDesignPartnerEvent } from "./analytics";
import { readSession } from "@/lib/auth/session-store";

const VOTES_KEY = "forgeos-dp-roadmap-votes";

let memoryVotes: RoadmapVote[] = [];

function readVotes(): RoadmapVote[] {
  if (typeof window === "undefined") return memoryVotes;
  const stored = readStorage<RoadmapVote[]>(VOTES_KEY, []);
  memoryVotes = stored;
  return memoryVotes;
}

function writeVotes(votes: RoadmapVote[]): void {
  memoryVotes = votes;
  writeStorage(VOTES_KEY, votes);
}

function getVoterId(): { userId?: string; email?: string } {
  if (typeof window === "undefined") return {};
  const session = readSession();
  return { userId: session?.userId, email: session?.email };
}

export function listRoadmapWithVotes(): RoadmapItemWithVotes[] {
  const votes = readVotes();
  const voter = getVoterId();

  return PUBLIC_ROADMAP.map((item) => {
    const itemVotes = votes.filter((v) => v.itemId === item.id);
    const userVoted = itemVotes.some(
      (v) =>
        (voter.userId && v.userId === voter.userId) ||
        (voter.email && v.email === voter.email)
    );
    return {
      ...item,
      voteCount: itemVotes.length,
      userVoted,
    };
  }).sort((a, b) => b.voteCount - a.voteCount);
}

export function voteForRoadmapItem(itemId: string): { success: boolean; error?: string } {
  const item = PUBLIC_ROADMAP.find((i) => i.id === itemId);
  if (!item) return { success: false, error: "Ítem de roadmap no encontrado." };

  const voter = getVoterId();
  const votes = readVotes();
  const already = votes.some(
    (v) =>
      v.itemId === itemId &&
      ((voter.userId && v.userId === voter.userId) ||
        (voter.email && v.email === voter.email))
  );
  if (already) return { success: false, error: "Ya has votado este ítem." };

  const vote: RoadmapVote = {
    itemId,
    userId: voter.userId,
    email: voter.email,
    votedAt: new Date().toISOString(),
  };
  writeVotes([...votes, vote]);

  trackDesignPartnerEvent({
    event: "dp_roadmap_vote",
    label: item.title,
    userId: voter.userId,
    meta: { itemId },
  });

  return { success: true };
}

export function getRoadmapVoteCount(): number {
  return readVotes().length;
}

export function removeRoadmapVote(itemId: string): boolean {
  const voter = getVoterId();
  const votes = readVotes();
  const filtered = votes.filter(
    (v) =>
      !(
        v.itemId === itemId &&
        ((voter.userId && v.userId === voter.userId) ||
          (voter.email && v.email === voter.email))
      )
  );
  if (filtered.length === votes.length) return false;
  writeVotes(filtered);
  return true;
}
