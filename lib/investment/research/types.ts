/**
 * Research Engine shared types — ANALYSIS_ONLY.
 * Never invents Bloomberg/Reuters content; missing keys → CONFIG_REQUIRED / NO_DATA.
 */

export const RESEARCH_ENGINE_IDS = [
  "news",
  "macro",
  "company",
  "technical",
  "quant",
  "sentiment",
  "events",
  "pattern",
  "ai-researcher",
] as const;

export type ResearchEngineId = (typeof RESEARCH_ENGINE_IDS)[number];

/** Honest wiring label — never claim LIVE for fabricated feeds. */
export type EngineWiringStatus =
  | "LIVE"
  | "CONFIG_REQUIRED"
  | "NO_DATA"
  | "STUB"
  | "PARTIAL";

export type ResearchScoreKind =
  | "research"
  | "macro"
  | "fundamental"
  | "technical"
  | "quant"
  | "sentiment"
  | "risk"
  | "overall";

export type ResearchScore = {
  readonly kind: ResearchScoreKind;
  readonly value: number | null;
  /** 0–1 when value is derived from real signals; null when unavailable. */
  readonly confidence: number | null;
  readonly label: "LIVE" | "PARTIAL" | "NO_DATA" | "DEMO";
  readonly evidence: readonly string[];
};

export type ResearchScores = {
  readonly symbol: string;
  readonly generatedAt: string;
  readonly scores: readonly ResearchScore[];
  readonly overall: ResearchScore;
};

export type EngineRunResult = {
  readonly engineId: ResearchEngineId;
  readonly status: EngineWiringStatus;
  readonly title: string;
  readonly summary: string;
  readonly lines: readonly string[];
  readonly itemCount: number;
  readonly providers: readonly string[];
  readonly evidence: readonly string[];
  /** Optional numeric signal for scoring (null = unavailable). */
  readonly signal: number | null;
  readonly generatedAt: string;
};

export type ResearchAlert = {
  readonly id: string;
  readonly severity: "info" | "watch" | "critical";
  readonly title: string;
  readonly detail: string;
  readonly symbol?: string;
  readonly source: string;
};

export type ResearchEvent = {
  readonly id: string;
  readonly kind: "earnings" | "dividend" | "macro" | "other";
  readonly title: string;
  readonly when: string | null;
  readonly symbol?: string;
  readonly source: string;
};

export type InvestmentDossier = {
  readonly symbol: string;
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly executiveSummary: string;
  readonly scores: ResearchScores;
  readonly engines: readonly EngineRunResult[];
  readonly alerts: readonly ResearchAlert[];
  readonly events: readonly ResearchEvent[];
  readonly sources: readonly string[];
  readonly note: string;
};

export type WatchlistBucket = {
  readonly id: string;
  readonly label: string;
  readonly criterion: "sector" | "country" | "strategy" | "volatility" | "opportunity";
  readonly symbols: readonly string[];
  readonly note: string;
};

export type ResearchMemoryEntry = {
  readonly id: string;
  readonly version: number;
  readonly symbol: string;
  readonly createdAt: string;
  readonly overallScore: number | null;
  readonly opinion: string;
  readonly scoresSnapshot: readonly ResearchScore[];
  readonly engineStatuses: readonly { readonly engineId: ResearchEngineId; readonly status: EngineWiringStatus }[];
};

export type ResearchMemoryIndex = {
  readonly updatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  /** Append-only ids (newest last). */
  readonly ids: readonly string[];
};

export type ResearchEngineRegistryRow = {
  readonly id: ResearchEngineId;
  readonly title: string;
  readonly wiring: EngineWiringStatus;
  readonly description: string;
  readonly providers: readonly string[];
};

export type ResearchDashboardSnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly liveTradingEnabled: false;
  readonly ibkrReadOnly: true;
  readonly symbols: readonly string[];
  readonly engines: readonly ResearchEngineRegistryRow[];
  readonly latestResearch: readonly {
    readonly symbol: string;
    readonly overall: number | null;
    readonly summary: string;
    readonly status: EngineWiringStatus;
  }[];
  readonly analyzedCompanies: readonly string[];
  readonly alerts: readonly ResearchAlert[];
  readonly criticalNews: readonly { readonly title: string; readonly source: string; readonly publishedAt: string }[];
  readonly opportunities: readonly { readonly symbol: string; readonly note: string; readonly href: string }[];
  readonly events: readonly ResearchEvent[];
  readonly watchlists: readonly WatchlistBucket[];
  readonly memoryCount: number;
  readonly dossiers: readonly InvestmentDossier[];
  readonly cacheHit: boolean;
  readonly note: string;
  readonly integrations: Readonly<Record<string, string>>;
};
