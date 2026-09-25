import "server-only";

import { gatherScreener } from "@/lib/investment/screener-gather";
import { getMarketIntelligenceStatus } from "@/lib/investment/market-intelligence-status";
import { listPeerResearchEngines, buildEngineRegistryRows } from "./registry";
import { composeResearchScores } from "./scoring";
import { buildInvestmentDossier } from "./dossier";
import { buildIntelligentWatchlists } from "./watchlists";
import { appendResearchMemory, listResearchMemoryEntries } from "./memory";
import { buildExecutiveSummary } from "./engines/ai-researcher";
import { baseResult } from "./engines/contract";
import type { ResearchEngineContext } from "./engines/contract";
import {
  getCachedResearchSnapshot,
  researchCacheKey,
  setCachedResearchSnapshot,
} from "./cache";
import { researchIntegrationFacades } from "./integrations";
import type {
  EngineRunResult,
  InvestmentDossier,
  ResearchDashboardSnapshot,
  ResearchScores,
} from "./types";

const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "SPY"] as const;

function buildContext(input: {
  readonly symbol: string;
  readonly symbols: readonly string[];
  readonly mi: Awaited<ReturnType<typeof gatherScreener>>["result"];
  readonly status: ReturnType<typeof getMarketIntelligenceStatus>;
  readonly providersConfigured: number;
  readonly generatedAt: string;
}): ResearchEngineContext {
  return {
    symbol: input.symbol,
    symbols: input.symbols,
    mi: input.mi,
    newsProviders: input.status.newsProviders.map((p) => p.id),
    economicProviders: input.status.economicProviders.map((p) => p.id),
    sentimentProviders: input.status.sentimentProviders.map((p) => p.id),
    marketProviders: input.status.marketProviders.map((p) => p.id),
    providersConfigured: input.providersConfigured,
    generatedAt: input.generatedAt,
  };
}

async function runEnginesForSymbol(
  ctx: ResearchEngineContext,
): Promise<{ engines: EngineRunResult[]; scores: ResearchScores; dossier: InvestmentDossier }> {
  const peers = listPeerResearchEngines();
  const peerResults: EngineRunResult[] = [];
  for (const engine of peers) {
    peerResults.push(await Promise.resolve(engine.run(ctx)));
  }

  const summary = buildExecutiveSummary(ctx.symbol, peerResults);
  const hasRealCoverage = peerResults.some(
    (result) =>
      (result.status === "LIVE" || result.status === "PARTIAL") &&
      result.providers.length > 0,
  );
  const aiResult = baseResult(
    "ai-researcher",
    "AI Researcher",
    {
      status: hasRealCoverage
        ? "LIVE"
        : ctx.providersConfigured > 0
          ? "NO_DATA"
          : "CONFIG_REQUIRED",
      summary,
      lines: summary.split(/(?<=\.)\s+/).slice(0, 6),
      itemCount: peerResults.filter((e) => e.status === "LIVE" || e.status === "PARTIAL").length,
      providers: [...new Set(peerResults.flatMap((e) => e.providers))],
      evidence: peerResults.flatMap((e) => e.evidence).slice(0, 6),
      signal:
        peerResults.filter((e) => e.signal != null).length > 0
          ? peerResults
              .filter((e) => e.signal != null)
              .reduce((a, e) => a + (e.signal as number), 0) /
            peerResults.filter((e) => e.signal != null).length
          : null,
    },
    ctx.generatedAt,
  );

  const engines = [...peerResults, aiResult];
  const scores = composeResearchScores(ctx.symbol, engines, ctx.generatedAt);
  const dossier = buildInvestmentDossier({
    symbol: ctx.symbol,
    engines,
    scores,
    generatedAt: ctx.generatedAt,
  });

  return { engines, scores, dossier };
}

export type ResearchOrchestratorOptions = {
  readonly symbols?: readonly string[];
  readonly persistMemory?: boolean;
  readonly skipCache?: boolean;
  readonly cacheTtlMs?: number;
};

/**
 * Research Engine orchestrator — gather MI once, run modular engines, compose dossiers.
 * ANALYSIS_ONLY; never places orders. Cached for UI polling.
 */
export async function runResearchOrchestrator(
  options?: ResearchOrchestratorOptions,
): Promise<ResearchDashboardSnapshot> {
  const symbols = (options?.symbols?.length ? options.symbols : DEFAULT_SYMBOLS)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 8);

  const cacheKey = researchCacheKey(symbols);
  if (!options?.skipCache) {
    const hit = getCachedResearchSnapshot(cacheKey);
    if (hit) return hit;
  }

  const status = getMarketIntelligenceStatus();
  const gather = await gatherScreener(symbols);
  const generatedAt = new Date().toISOString();

  const baseCtx = buildContext({
    symbol: symbols[0] ?? "AAPL",
    symbols,
    mi: gather.result,
    status,
    providersConfigured: gather.providersConfigured,
    generatedAt,
  });

  const dossiers: InvestmentDossier[] = [];
  for (const symbol of symbols) {
    const ctx = { ...baseCtx, symbol };
    const { dossier, scores } = await runEnginesForSymbol(ctx);
    dossiers.push(dossier);

    if (options?.persistMemory) {
      appendResearchMemory({
        symbol,
        opinion: dossier.executiveSummary,
        scores,
        engines: dossier.engines,
      });
    }
  }

  const registry = buildEngineRegistryRows(baseCtx);
  const memory = listResearchMemoryEntries({ limit: 20 });
  const watchlists = buildIntelligentWatchlists({ symbols, dossiers });

  const alerts = dossiers.flatMap((d) => d.alerts).slice(0, 24);
  const events = dossiers.flatMap((d) => d.events).slice(0, 24);
  const criticalNews = (gather.result?.news ?? [])
    .slice(0, 8)
    .map((n) => ({
      title: n.title,
      source: n.source || n.providerId,
      publishedAt: n.publishedAt,
    }));

  const opportunities = dossiers
    .filter((d) => d.scores.overall.value != null && (d.scores.overall.value as number) >= 55)
    .map((d) => ({
      symbol: d.symbol,
      note: `Overall ${(d.scores.overall.value as number).toFixed(1)}`,
      href: `/investment/research?symbol=${encodeURIComponent(d.symbol)}`,
    }));

  // Deep-link from opportunities hub when research scores exist
  const oppLinks = opportunities.length
    ? opportunities
    : symbols.map((s) => ({
        symbol: s,
        note: "Open dossier",
        href: `/investment/research?symbol=${encodeURIComponent(s)}`,
      }));

  const snapshot: ResearchDashboardSnapshot = {
    generatedAt,
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    ibkrReadOnly: true,
    symbols,
    engines: registry,
    latestResearch: dossiers.map((d) => ({
      symbol: d.symbol,
      overall: d.scores.overall.value,
      summary: d.executiveSummary.slice(0, 180),
      status:
        d.engines.some((e) => e.status === "LIVE")
          ? "LIVE"
          : d.engines.some((e) => e.status === "PARTIAL")
            ? "PARTIAL"
            : d.engines.some((e) => e.status === "STUB")
              ? "STUB"
              : d.engines.some((e) => e.status === "CONFIG_REQUIRED")
                ? "CONFIG_REQUIRED"
                : "NO_DATA",
    })),
    analyzedCompanies: dossiers
      .filter((d) => d.engines.some((e) => e.engineId === "company" && (e.status === "LIVE" || e.status === "PARTIAL")))
      .map((d) => d.symbol),
    alerts,
    criticalNews,
    opportunities: oppLinks,
    events,
    watchlists,
    memoryCount: memory.length,
    dossiers,
    cacheHit: false,
    note: gather.note,
    integrations: researchIntegrationFacades(),
  };

  setCachedResearchSnapshot(cacheKey, snapshot, options?.cacheTtlMs ?? 30_000);
  return snapshot;
}

export async function getResearchDossier(
  symbol: string,
  options?: { readonly persistMemory?: boolean },
): Promise<InvestmentDossier | null> {
  const snap = await runResearchOrchestrator({
    symbols: [symbol],
    persistMemory: options?.persistMemory,
    skipCache: true,
  });
  return snap.dossiers[0] ?? null;
}

export async function getResearchScoresForSymbol(
  symbol: string,
): Promise<ResearchScores | null> {
  const dossier = await getResearchDossier(symbol);
  return dossier?.scores ?? null;
}
