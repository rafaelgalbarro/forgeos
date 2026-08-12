/**
 * Canonical AI Investment Committee seats + ecosystem name aliases.
 * Labels are UI-facing; aliases match specialty / market / CIO agent names.
 */

export type CommitteeSeatId =
  | "macro"
  | "fundamental"
  | "technical"
  | "quant"
  | "sentiment"
  | "news"
  | "flow"
  | "options"
  | "risk"
  | "portfolio"
  | "cio";

export type CommitteeSeatDef = {
  readonly id: CommitteeSeatId;
  readonly label: string;
  /** Exact ecosystem display names / ids that map to this seat. */
  readonly aliases: readonly string[];
};

/** Fixed committee roster — always rendered; missing data → NO_DATA. */
export const COMMITTEE_SEATS: readonly CommitteeSeatDef[] = [
  {
    id: "macro",
    label: "Macro Analyst",
    aliases: ["Macro Analyst", "specialty-macro", "macro"],
  },
  {
    id: "fundamental",
    label: "Fundamental Analyst",
    aliases: ["Fundamental Analyst", "specialty-fundamental", "fundamental"],
  },
  {
    id: "technical",
    label: "Technical Analyst",
    aliases: ["Technical Analyst", "specialty-technical", "technical"],
  },
  {
    id: "quant",
    label: "Quant Analyst",
    aliases: ["Quant Analyst", "specialty-quant", "quant"],
  },
  {
    id: "sentiment",
    label: "Sentiment Analyst",
    aliases: ["Sentiment Analyst", "specialty-sentiment", "sentiment"],
  },
  {
    id: "news",
    label: "News Analyst",
    aliases: ["News Analyst", "specialty-news", "news"],
  },
  {
    id: "flow",
    label: "Flow Analyst",
    aliases: [
      "Institutional Flows Analyst",
      "Flow Analyst",
      "specialty-institutional-flows",
      "institutional-flows",
      "institutionalFlows",
    ],
  },
  {
    id: "options",
    label: "Options Analyst",
    aliases: ["Options Desk", "Options Analyst", "market-options", "options"],
  },
  {
    id: "risk",
    label: "Risk Manager",
    aliases: ["Risk Manager", "specialty-risk", "risk"],
  },
  {
    id: "portfolio",
    label: "Portfolio Manager",
    aliases: ["Portfolio Manager", "specialty-portfolio-manager", "portfolio-manager", "portfolioFit"],
  },
  {
    id: "cio",
    label: "Chief Investment Officer",
    aliases: ["Chief Investment Officer", "CIO", "cio"],
  },
] as const;

export type RawAgentObservation = {
  readonly agentName: string;
  readonly agentId?: string | null;
  readonly score: number | null;
  readonly confidence: number | null;
  readonly recommendation: string | null;
  readonly explanation: string | null;
  readonly sources: readonly string[];
  readonly updatedAt: string | null;
};

export function normalizeAgentKey(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

/** Map an ecosystem agent name/id to a committee seat, or null if not in roster. */
export function matchCommitteeSeat(agentNameOrId: string): CommitteeSeatDef | null {
  const key = normalizeAgentKey(agentNameOrId);
  for (const seat of COMMITTEE_SEATS) {
    if (normalizeAgentKey(seat.label) === key) return seat;
    for (const alias of seat.aliases) {
      if (normalizeAgentKey(alias) === key) return seat;
    }
  }
  return null;
}
