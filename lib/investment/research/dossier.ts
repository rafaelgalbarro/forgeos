import type {
  EngineRunResult,
  InvestmentDossier,
  ResearchAlert,
  ResearchEvent,
  ResearchScores,
} from "./types";
import { buildExecutiveSummary } from "./engines/ai-researcher";

function buildAlerts(
  symbol: string,
  engines: readonly EngineRunResult[],
  scores: ResearchScores,
): ResearchAlert[] {
  const alerts: ResearchAlert[] = [];
  const news = engines.find((e) => e.engineId === "news");
  if (news?.status === "LIVE" && news.itemCount > 0) {
    alerts.push({
      id: `alert-news-${symbol}`,
      severity: news.itemCount >= 5 ? "watch" : "info",
      title: `${symbol}: news flow`,
      detail: news.summary,
      symbol,
      source: "news",
    });
  }
  const events = engines.find((e) => e.engineId === "events");
  if (events?.status === "LIVE" && events.itemCount > 0) {
    alerts.push({
      id: `alert-events-${symbol}`,
      severity: "watch",
      title: `${symbol}: events detected`,
      detail: events.summary,
      symbol,
      source: "events",
    });
  }
  if (scores.overall.value != null && scores.overall.value < 35) {
    alerts.push({
      id: `alert-score-${symbol}`,
      severity: "critical",
      title: `${symbol}: low overall research score`,
      detail: `Overall ${scores.overall.value.toFixed(1)} — review risk/technical/sentiment.`,
      symbol,
      source: "scoring",
    });
  }
  for (const e of engines) {
    if (e.status === "CONFIG_REQUIRED") {
      alerts.push({
        id: `alert-cfg-${e.engineId}-${symbol}`,
        severity: "info",
        title: `${e.title}: CONFIG_REQUIRED`,
        detail: e.summary,
        symbol,
        source: e.engineId,
      });
    }
  }
  return alerts;
}

function eventsFromEngine(engine: EngineRunResult | undefined): ResearchEvent[] {
  if (!engine || engine.status !== "LIVE") return [];
  return engine.lines
    .filter((l) => l.startsWith("["))
    .map((l, i) => {
      const m = /^\[(\w+)\]\s*(.*)$/.exec(l);
      const kindRaw = m?.[1] ?? "other";
      const kind =
        kindRaw === "earnings" || kindRaw === "dividend" || kindRaw === "macro"
          ? kindRaw
          : "other";
      return {
        id: `${engine.engineId}-evt-${i}`,
        kind,
        title: m?.[2] ?? l,
        when: null as string | null,
        source: engine.engineId,
      };
    });
}

export function buildInvestmentDossier(input: {
  readonly symbol: string;
  readonly engines: readonly EngineRunResult[];
  readonly scores: ResearchScores;
  readonly generatedAt?: string;
}): InvestmentDossier {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const symbol = input.symbol.toUpperCase();
  const executiveSummary = buildExecutiveSummary(symbol, input.engines);
  const eventsEngine = input.engines.find((e) => e.engineId === "events");
  const sources = [
    ...new Set(input.engines.flatMap((e) => e.providers)),
  ];

  return {
    symbol,
    generatedAt,
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    executiveSummary,
    scores: input.scores,
    engines: input.engines,
    alerts: buildAlerts(symbol, input.engines, input.scores),
    events: eventsFromEngine(eventsEngine),
    sources,
    note:
      sources.length === 0
        ? "NO_DATA — configure Market Intelligence providers. Never invents Bloomberg/Reuters."
        : "Dossier composed from configured MI + research engines. ANALYSIS_ONLY.",
  };
}
