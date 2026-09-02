import "server-only";

import {
  COMMITTEE_SEATS,
  matchCommitteeSeat,
  type CommitteeSeatId,
  type RawAgentObservation,
} from "@/lib/investment/committee-agents";
import {
  getCommitteeReplaySnapshot,
  type CommitteeReplayEntry,
  type CommitteeReplayFilters,
  type CommitteeReplaySnapshot,
} from "@/lib/investment/committee-replay";
import { getContinuousAnalysisRuntime } from "@/src/core/investment/continuous-analysis";
import {
  createDefaultInvestmentMemoryRepository,
  createInvestmentMemoryService,
  type DecisionHistoryRecord,
} from "@/src/core/investment/server";
import { stanceFromScore } from "@/src/core/investment/application/agents/base";

export type CommitteeAgentCard = {
  readonly seatId: CommitteeSeatId;
  readonly label: string;
  readonly state: "READY" | "NO_DATA";
  readonly score: number | null;
  readonly confidence: number | null;
  readonly recommendation: string | null;
  readonly explanation: string | null;
  readonly sources: readonly string[];
  readonly updatedAt: string | null;
  readonly mappedFrom: string | null;
};

export type CommitteeAggregatePanel = {
  readonly title: string;
  readonly state: "READY" | "NO_DATA";
  readonly summary: string | null;
  readonly confidence: number | null;
  readonly dissent: number | null;
  readonly buyScore: number | null;
  readonly sellScore: number | null;
  readonly holdScore: number | null;
  readonly lines: readonly string[];
  readonly minority: ReadonlyArray<{
    readonly agent: string;
    readonly stance: string;
    readonly reasoning: string;
  }>;
};

export type CommitteePanelSnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly liveTradingEnabled: false;
  readonly symbol: string | null;
  readonly agents: readonly CommitteeAgentCard[];
  readonly consenso: CommitteeAggregatePanel;
  readonly disenso: CommitteeAggregatePanel;
  readonly minorityReport: CommitteeAggregatePanel;
  readonly replay: CommitteeReplaySnapshot;
  readonly note: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function pickString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/** Parse CIO evidence lines: `Agent: buy=0.55 sell=0.20 hold=0.25 conf=0.70` */
function parseEvidenceLine(line: string, updatedAt: string | null): RawAgentObservation | null {
  const m = line.match(
    /^(.+?):\s*buy=([-\d.]+)\s+sell=([-\d.]+)\s+hold=([-\d.]+)\s+conf=([-\d.]+)/i,
  );
  if (!m) return null;
  const buy = Number(m[2]);
  const sell = Number(m[3]);
  const hold = Number(m[4]);
  const conf = Number(m[5]);
  if (![buy, sell, hold, conf].every((n) => Number.isFinite(n))) return null;
  const stance = stanceFromScore({ buy, sell, hold });
  const score = stance === "BUY" ? buy : stance === "SELL" ? sell : hold;
  return {
    agentName: m[1]!.trim(),
    score,
    confidence: conf,
    recommendation: stance,
    explanation: line,
    sources: [],
    updatedAt,
  };
}

function observationFromObject(
  obj: Record<string, unknown>,
  fallbackUpdatedAt: string | null,
): RawAgentObservation | null {
  const agentName =
    pickString(obj.agent, obj.agentName, obj.name, obj.displayName) ??
    (typeof obj.agentId === "string" ? obj.agentId : null);
  if (!agentName) return null;

  const scoreObj = asRecord(obj.score);
  const buy = finiteNumber(scoreObj?.buy ?? obj.buy ?? obj.buyScore);
  const sell = finiteNumber(scoreObj?.sell ?? obj.sell ?? obj.sellScore);
  const hold = finiteNumber(scoreObj?.hold ?? obj.hold ?? obj.holdScore);
  let score = finiteNumber(obj.netScore ?? obj.signal ?? obj.scoreValue);
  let recommendation = pickString(obj.stance, obj.recommendation, obj.action, obj.consensus);

  if (buy != null && sell != null && hold != null) {
    const stance = stanceFromScore({ buy, sell, hold });
    recommendation = recommendation ?? stance;
    score = score ?? (stance === "BUY" ? buy : stance === "SELL" ? sell : hold);
  } else if (typeof obj.score === "number" && Number.isFinite(obj.score)) {
    score = obj.score;
  }

  const confidence = finiteNumber(obj.confidence ?? obj.confianza);
  const explanation = pickString(obj.reasoning, obj.summary, obj.explanation, obj.explicacion);
  const sources = [
    ...asStringArray(obj.sources),
    ...asStringArray(obj.evidence),
    ...asStringArray(obj.fuentes),
  ];

  return {
    agentName,
    agentId: typeof obj.agentId === "string" ? obj.agentId : null,
    score,
    confidence,
    recommendation,
    explanation,
    sources,
    updatedAt: pickString(obj.asOf, obj.updatedAt, obj.occurredAt) ?? fallbackUpdatedAt,
  };
}

function collectFromArray(value: unknown, updatedAt: string | null): RawAgentObservation[] {
  if (!Array.isArray(value)) return [];
  const out: RawAgentObservation[] = [];
  for (const row of value) {
    const obj = asRecord(row);
    if (!obj) continue;
    const obs = observationFromObject(obj, updatedAt);
    if (obs) out.push(obs);
  }
  return out;
}

function observationsFromMemoryRecord(record: DecisionHistoryRecord): RawAgentObservation[] {
  const payload = asRecord(record.payload) ?? {};
  const committee = asRecord(payload.committee) ?? asRecord(payload.Committee) ?? {};
  const decision = asRecord(payload.decision) ?? asRecord(payload.InvestmentDecision) ?? {};
  const brain = asRecord(payload.brain) ?? asRecord(payload.InvestmentBrain) ?? {};
  const ecosystem = asRecord(payload.ecosystem) ?? asRecord(payload.agentEcosystem) ?? {};
  const updatedAt = record.occurredAt;

  const collected: RawAgentObservation[] = [
    ...collectFromArray(payload.agents, updatedAt),
    ...collectFromArray(payload.conclusions, updatedAt),
    ...collectFromArray(payload.subordinateResults, updatedAt),
    ...collectFromArray(payload.agentResults, updatedAt),
    ...collectFromArray(committee.agents, updatedAt),
    ...collectFromArray(committee.agentResults, updatedAt),
    ...collectFromArray(committee.conclusions, updatedAt),
    ...collectFromArray(ecosystem.conclusions, updatedAt),
    ...collectFromArray(ecosystem.agents, updatedAt),
  ];

  const minority = committee.minorityReport ?? committee.minority_report;
  if (Array.isArray(minority)) {
    for (const row of minority) {
      const obj = asRecord(row);
      if (!obj) continue;
      const agent = pickString(obj.agent, obj.agentName);
      if (!agent) continue;
      collected.push({
        agentName: agent,
        score: null,
        confidence: null,
        recommendation: pickString(obj.stance, obj.recommendation),
        explanation: pickString(obj.reasoning, obj.explanation),
        sources: [],
        updatedAt,
      });
    }
  }

  const evidence = asStringArray(
    payload.evidence ?? decision.evidence ?? brain.evidence ?? committee.evidence,
  );
  for (const line of evidence) {
    const parsed = parseEvidenceLine(line, updatedAt);
    if (parsed) collected.push(parsed);
  }

  // CIO aggregate from committee artifact when present
  const consensus = pickString(committee.consensus, decision.recommendation, brain.recommendation);
  const cioConfidence = finiteNumber(committee.confidence ?? decision.confidence ?? brain.confidence);
  if (consensus != null || cioConfidence != null) {
    const buy = finiteNumber(committee.buyScore ?? committee.buy_score);
    const sell = finiteNumber(committee.sellScore ?? committee.sell_score);
    const hold = finiteNumber(committee.holdScore ?? committee.hold_score);
    let score: number | null = null;
    if (buy != null && sell != null && hold != null) {
      const stance = stanceFromScore({ buy, sell, hold });
      score = stance === "BUY" ? buy : stance === "SELL" ? sell : hold;
    }
    collected.push({
      agentName: "Chief Investment Officer",
      score,
      confidence: cioConfidence,
      recommendation: consensus,
      explanation: pickString(
        committee.explanation,
        Array.isArray(decision.reasoning) ? decision.reasoning[0] : null,
        Array.isArray(brain.reasoning) ? brain.reasoning[0] : null,
      ),
      sources: asStringArray(committee.sourcesUsed ?? brain.usedSources),
      updatedAt,
    });
  }

  return collected;
}

function observationsFromReplayEntry(entry: CommitteeReplayEntry): RawAgentObservation[] {
  const out: RawAgentObservation[] = [];
  for (const m of entry.minorityReport) {
    out.push({
      agentName: m.agent,
      score: null,
      confidence: null,
      recommendation: m.stance,
      explanation: m.reasoning,
      sources: [],
      updatedAt: entry.occurredAt,
    });
  }
  for (const line of entry.reasoning) {
    const parsed = parseEvidenceLine(line, entry.occurredAt);
    if (parsed) out.push(parsed);
  }
  if (entry.recommendation || entry.consensus || entry.confidence != null) {
    const buy = entry.buyScore;
    const sell = entry.sellScore;
    const hold = entry.holdScore;
    let score: number | null = null;
    if (buy != null && sell != null && hold != null) {
      const stance = stanceFromScore({ buy, sell, hold });
      score = stance === "BUY" ? buy : stance === "SELL" ? sell : hold;
    }
    out.push({
      agentName: "Chief Investment Officer",
      score,
      confidence: entry.confidence,
      recommendation: entry.recommendation ?? entry.consensus,
      explanation: entry.reasoning[0] ?? entry.note,
      sources: [],
      updatedAt: entry.occurredAt,
    });
  }
  return out;
}

function observationsFromContinuousAnalysis(): RawAgentObservation[] {
  try {
    const last = getContinuousAnalysisRuntime().getSnapshot().lastResult;
    if (!last) return [];
    const out: RawAgentObservation[] = [];
    for (const c of last.conclusionsSample) {
      const stance = c.stance;
      const score =
        stance === "BUY" ? c.score.buy : stance === "SELL" ? c.score.sell : c.score.hold;
      out.push({
        agentName: c.agentName,
        agentId: c.agentId,
        score,
        confidence: c.confidence,
        recommendation: stance,
        explanation: c.summary,
        sources: [...c.sources],
        updatedAt: c.asOf || last.generatedAt,
      });
    }
    // Parse CIO evidence lines from scanner rows (full agent set when present)
    for (const row of [...last.accepted, ...last.discarded].slice(0, 5)) {
      for (const line of row.evidence) {
        const parsed = parseEvidenceLine(line, last.generatedAt);
        if (parsed) out.push(parsed);
      }
    }
    // Best accepted row → CIO stance when sample has committee metadata
    const top = last.accepted[0] ?? last.discarded[0];
    if (top) {
      out.push({
        agentName: "Chief Investment Officer",
        score: top.confidence,
        confidence: top.confidence,
        recommendation: top.committeeAction ?? top.committeeConsensus,
        explanation: top.explanation,
        sources: [...top.sourcesUsed],
        updatedAt: last.generatedAt,
      });
    }
    return out;
  } catch {
    return [];
  }
}

function preferRicher(a: RawAgentObservation, b: RawAgentObservation): RawAgentObservation {
  const richness = (o: RawAgentObservation) =>
    (o.score != null ? 2 : 0) +
    (o.confidence != null ? 2 : 0) +
    (o.recommendation ? 1 : 0) +
    (o.explanation ? 1 : 0) +
    (o.sources.length > 0 ? 1 : 0);
  return richness(b) > richness(a) ? b : a;
}

function buildAgentCards(observations: readonly RawAgentObservation[]): CommitteeAgentCard[] {
  const bySeat = new Map<CommitteeSeatId, { obs: RawAgentObservation; mappedFrom: string }>();

  for (const obs of observations) {
    const seat =
      matchCommitteeSeat(obs.agentName) ??
      (obs.agentId ? matchCommitteeSeat(obs.agentId) : null);
    if (!seat) continue;
    const prev = bySeat.get(seat.id);
    if (!prev) {
      bySeat.set(seat.id, { obs, mappedFrom: obs.agentName });
    } else {
      bySeat.set(seat.id, {
        obs: preferRicher(prev.obs, obs),
        mappedFrom: obs.agentName,
      });
    }
  }

  return COMMITTEE_SEATS.map((seat) => {
    const hit = bySeat.get(seat.id);
    if (!hit) {
      return {
        seatId: seat.id,
        label: seat.label,
        state: "NO_DATA" as const,
        score: null,
        confidence: null,
        recommendation: null,
        explanation: null,
        sources: [],
        updatedAt: null,
        mappedFrom: null,
      };
    }
    const { obs, mappedFrom } = hit;
    const hasData =
      obs.score != null ||
      obs.confidence != null ||
      Boolean(obs.recommendation) ||
      Boolean(obs.explanation) ||
      obs.sources.length > 0;
    return {
      seatId: seat.id,
      label: seat.label,
      state: hasData ? ("READY" as const) : ("NO_DATA" as const),
      score: obs.score,
      confidence: obs.confidence,
      recommendation: obs.recommendation,
      explanation: obs.explanation,
      sources: obs.sources,
      updatedAt: obs.updatedAt,
      mappedFrom: mappedFrom !== seat.label ? mappedFrom : null,
    };
  });
}

function emptyAggregate(title: string, summary: string | null = null): CommitteeAggregatePanel {
  return {
    title,
    state: "NO_DATA",
    summary,
    confidence: null,
    dissent: null,
    buyScore: null,
    sellScore: null,
    holdScore: null,
    lines: [],
    minority: [],
  };
}

function buildAggregates(latest: CommitteeReplayEntry | null): {
  consenso: CommitteeAggregatePanel;
  disenso: CommitteeAggregatePanel;
  minorityReport: CommitteeAggregatePanel;
} {
  if (!latest) {
    return {
      consenso: emptyAggregate("Consenso", "NO_DATA — sin decisión de comité en memoria"),
      disenso: emptyAggregate("Disenso", "NO_DATA"),
      minorityReport: emptyAggregate("Minority Report", "NO_DATA"),
    };
  }

  const consensusLabel = latest.consensus ?? latest.recommendation;
  const hasConsensus =
    consensusLabel != null ||
    latest.confidence != null ||
    latest.buyScore != null ||
    latest.sellScore != null ||
    latest.holdScore != null;

  const consenso: CommitteeAggregatePanel = {
    title: "Consenso",
    state: hasConsensus ? "READY" : "NO_DATA",
    summary: consensusLabel,
    confidence: latest.confidence,
    dissent: latest.dissent,
    buyScore: latest.buyScore,
    sellScore: latest.sellScore,
    holdScore: latest.holdScore,
    lines: [
      ...(latest.approved == null ? [] : [`Approved: ${String(latest.approved)}`]),
      ...latest.reasoning.slice(0, 4),
      ...(latest.brainRecommendation ? [`Brain: ${latest.brainRecommendation}`] : []),
    ],
    minority: [],
  };

  const dissentReady = latest.dissent != null || latest.minorityReport.length > 0;
  const disenso: CommitteeAggregatePanel = {
    title: "Disenso",
    state: dissentReady ? "READY" : "NO_DATA",
    summary:
      latest.dissent == null
        ? latest.minorityReport.length
          ? `${latest.minorityReport.length} minority view(s)`
          : null
        : `dissent=${latest.dissent.toFixed(3)}`,
    confidence: latest.confidence,
    dissent: latest.dissent,
    buyScore: latest.buyScore,
    sellScore: latest.sellScore,
    holdScore: latest.holdScore,
    lines: latest.minorityReport.slice(0, 6).map((m) => `${m.agent}: ${m.stance} — ${m.reasoning}`),
    minority: latest.minorityReport,
  };

  const minorityReport: CommitteeAggregatePanel = {
    title: "Minority Report",
    state: latest.minorityReport.length ? "READY" : "NO_DATA",
    summary: latest.minorityReport.length
      ? `${latest.minorityReport.length} dissenting agent(s)`
      : "NO_DATA — sin minority report en el último registro",
    confidence: null,
    dissent: latest.dissent,
    buyScore: null,
    sellScore: null,
    holdScore: null,
    lines: latest.minorityReport.map((m) => `${m.agent} · ${m.stance} · ${m.reasoning}`),
    minority: latest.minorityReport,
  };

  return { consenso, disenso, minorityReport };
}

/**
 * Read-only AI Committee panel: all seats, aggregates, and historical replay.
 * Never invents scores; never creates decisions; ANALYSIS_ONLY.
 */
export async function getCommitteePanelSnapshot(
  filters: CommitteeReplayFilters = {},
): Promise<CommitteePanelSnapshot> {
  const replay = await getCommitteeReplaySnapshot({ ...filters, limit: filters.limit ?? 40 });
  const observations: RawAgentObservation[] = [];

  // Memory agent artifacts (deeper than replay entry projection)
  try {
    const memory = createInvestmentMemoryService({
      repository: createDefaultInvestmentMemoryRepository(),
    });
    const records = await memory.queryDecisionHistory({
      kind: "decision",
      symbol: filters.symbol && filters.symbol !== "ALL" ? filters.symbol : undefined,
      limit: 20,
    });
    for (const record of records) {
      observations.push(...observationsFromMemoryRecord(record));
    }
  } catch {
    /* fall through */
  }

  for (const entry of replay.entries) {
    observations.push(...observationsFromReplayEntry(entry));
  }

  observations.push(...observationsFromContinuousAnalysis());

  const agents = buildAgentCards(observations);
  const latest = replay.entries[0] ?? null;
  const aggregates = buildAggregates(latest);
  const readyCount = agents.filter((a) => a.state === "READY").length;

  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    symbol: latest?.symbol && latest.symbol !== "NO_DATA" ? latest.symbol : null,
    agents,
    consenso: aggregates.consenso,
    disenso: aggregates.disenso,
    minorityReport: aggregates.minorityReport,
    replay,
    note:
      readyCount > 0
        ? `AI Committee · ${readyCount}/${agents.length} agents with data · advisory only · no order path`
        : "NO_DATA — committee seats listed; awaiting memory / continuous-analysis agent artifacts",
  };
}
