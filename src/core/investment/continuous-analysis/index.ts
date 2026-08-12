/**
 * Continuous market-analysis runtime — 24/7 capable, ANALYSIS_ONLY.
 * Agents → conclusions → Investment Committee → scanner rows.
 * Optionally blends Market Intelligence gather when providers are configured.
 * Never places orders. Live trading remains LOCKED.
 */

import { runAgentEcosystem } from "../agent-ecosystem";
import type { AgentConclusion, AgentMarket } from "../agent-ecosystem";
import type { InvestmentAnalysisContext, InvestmentCommitteeDecision } from "../domain/types";
import {
  createDefaultStrategyEngine,
  getStrategyActivationStore,
  type StrategyAnalysis,
  type StrategyEngine,
  type StrategyId,
  type StrategyMarketContext,
  type StrategyRegime,
} from "../strategy";

export type ContinuousAnalysisStatus = "stopped" | "running" | "error";

export interface ContinuousScannerRow {
  readonly id: string;
  readonly symbol: string;
  readonly status: "accepted" | "discarded";
  readonly score: number;
  readonly risk: string;
  readonly committeeAction: InvestmentCommitteeDecision["action"];
  readonly committeeConsensus: InvestmentCommitteeDecision["consensus"];
  readonly confidence: number;
  readonly explanation: string;
  readonly discardReason?: string;
  readonly sourcesUsed: readonly string[];
  readonly evidence: readonly string[];
  readonly expectedPortfolioImpact: string;
  readonly timeHorizon: InvestmentCommitteeDecision["timeHorizon"];
  readonly risks: readonly string[];
  readonly agentCount: number;
  readonly enabledStrategyHits: number;
  readonly dataQuality: "REAL" | "DEMO";
}

export interface ContinuousAnalysisCycleResult {
  readonly cycleId: string;
  readonly generatedAt: string;
  readonly symbolsScanned: number;
  readonly accepted: readonly ContinuousScannerRow[];
  readonly discarded: readonly ContinuousScannerRow[];
  readonly conclusionsSample: readonly AgentConclusion[];
  readonly strategyAnalyses: readonly StrategyAnalysis[];
  readonly miProvidersUsed: readonly string[];
  readonly miDataQuality: "live-mi" | "stub-signals";
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly liveTradingEnabled: false;
  readonly autonomousLive: "LOCKED";
  readonly goLive: "NOT_READY_FOR_LIVE";
  readonly ibkrReadOnly: true;
}

export interface ContinuousAnalysisRuntimeSnapshot {
  readonly status: ContinuousAnalysisStatus;
  readonly startedAt: string | null;
  readonly lastCycleAt: string | null;
  readonly cyclesCompleted: number;
  readonly pollIntervalMs: number;
  readonly lastError: string | null;
  readonly lastResult: ContinuousAnalysisCycleResult | null;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly liveTradingEnabled: false;
  readonly autonomousLive: "LOCKED";
  readonly goLive: "NOT_READY_FOR_LIVE";
}

export interface ContinuousMiBlend {
  readonly providersUsed: readonly string[];
  readonly bySymbol: Readonly<
    Record<
      string,
      {
        price?: number;
        changePct?: number;
        volume?: number;
        newsSentiment?: number;
      }
    >
  >;
}

export type ContinuousMiGatherFn = (
  symbols: readonly string[],
) => Promise<ContinuousMiBlend | null>;

export interface ContinuousAnalysisRuntimeOptions {
  readonly pollIntervalMs?: number;
  readonly symbols?: readonly string[];
  readonly marketDesk?: AgentMarket;
  readonly regime?: StrategyRegime;
  readonly minConfidence?: number;
  readonly strategyEngine?: StrategyEngine;
  /** Optional MI gather hook — stubs when null/empty. */
  readonly miGather?: ContinuousMiGatherFn;
}

const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "SPY", "EURUSD", "GC"] as const;

function buildAnalysisContext(
  symbol: string,
  asOf: string,
  marketDesk?: AgentMarket,
  mi?: ContinuousMiBlend["bySymbol"][string],
): InvestmentAnalysisContext {
  const seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const n = (offset: number) => Math.sin((seed + offset) * 0.17) * 0.45;
  const change = mi?.changePct != null ? Math.max(-1, Math.min(1, mi.changePct / 5)) : n(1);
  const newsSent = mi?.newsSentiment ?? n(6);
  const hasMi = mi?.price != null || mi?.changePct != null || mi?.newsSentiment != null;
  return {
    asOf,
    symbol,
    market: {
      price: mi?.price ?? 100 + (seed % 50),
      volatility: 0.18 + (seed % 10) / 100,
      trend: change,
    },
    signals: {
      macro: n(2),
      fundamental: n(3),
      technical: change,
      quant: n(5),
      news: newsSent,
      risk: n(7) * 0.8,
      portfolioFit: n(8) * 0.6,
      sentiment: newsSent * 0.8,
      earnings: n(10),
      institutionalFlows: n(11),
      volatilitySpecialty: n(12),
      correlations: n(13),
      liquidity: mi?.volume != null && mi.volume > 0 ? 0.25 : n(14),
      execution: n(15),
    },
    notes: hasMi
      ? ["continuous-analysis", "mi-blended"]
      : ["continuous-analysis", "synthetic-signals-when-mi-missing"],
    marketDesk,
  };
}

function buildStrategyContext(
  symbol: string,
  asOf: string,
  regime: StrategyRegime,
  mi?: ContinuousMiBlend["bySymbol"][string],
): StrategyMarketContext {
  const seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const change = mi?.changePct != null ? mi.changePct / 100 : 0.006;
  return {
    symbol,
    price: mi?.price ?? 100 + (seed % 50),
    volume: mi?.volume ?? 1_000_000 + seed * 1000,
    averageVolume: 1_200_000,
    returns: [change, change * 0.5, -change * 0.2, change * 0.3, change * 0.4],
    rsi: 45 + (seed % 20),
    volatility: 0.2,
    peRatio: 18 + (seed % 15),
    earningsGrowth: 5 + (seed % 12),
    dividendYield: 1 + (seed % 4),
    qualityScore: 0.6,
    regime,
    capturedAt: asOf,
  };
}

export class ContinuousAnalysisRuntime {
  private timer: ReturnType<typeof setInterval> | null = null;
  private status: ContinuousAnalysisStatus = "stopped";
  private startedAt: string | null = null;
  private lastCycleAt: string | null = null;
  private cyclesCompleted = 0;
  private lastError: string | null = null;
  private lastResult: ContinuousAnalysisCycleResult | null = null;
  private readonly pollIntervalMs: number;
  private readonly symbols: readonly string[];
  private readonly marketDesk?: AgentMarket;
  private readonly regime: StrategyRegime;
  private readonly minConfidence: number;
  private readonly strategyEngine: StrategyEngine;
  private readonly miGather?: ContinuousMiGatherFn;

  constructor(options: ContinuousAnalysisRuntimeOptions = {}) {
    this.pollIntervalMs = Math.max(5_000, options.pollIntervalMs ?? 30_000);
    this.symbols = options.symbols?.length ? options.symbols : DEFAULT_SYMBOLS;
    this.marketDesk = options.marketDesk;
    this.regime = options.regime ?? "bullish";
    this.minConfidence = options.minConfidence ?? 0.42;
    this.strategyEngine = options.strategyEngine ?? createDefaultStrategyEngine();
    this.miGather = options.miGather;
  }

  getSnapshot(): ContinuousAnalysisRuntimeSnapshot {
    return {
      status: this.status,
      startedAt: this.startedAt,
      lastCycleAt: this.lastCycleAt,
      cyclesCompleted: this.cyclesCompleted,
      pollIntervalMs: this.pollIntervalMs,
      lastError: this.lastError,
      lastResult: this.lastResult,
      mode: "ANALYSIS_ONLY",
      orderExecution: "disabled",
      liveTradingEnabled: false,
      autonomousLive: "LOCKED",
      goLive: "NOT_READY_FOR_LIVE",
    };
  }

  start(): ContinuousAnalysisRuntimeSnapshot {
    if (this.timer) return this.getSnapshot();
    if (process.env.LIVE_TRADING_ENABLED === "true") {
      this.status = "error";
      this.lastError =
        "Refusing start: LIVE_TRADING_ENABLED must remain false for continuous analysis.";
      return this.getSnapshot();
    }
    this.status = "running";
    this.startedAt = new Date().toISOString();
    this.lastError = null;
    void this.runCycle();
    this.timer = setInterval(() => {
      void this.runCycle();
    }, this.pollIntervalMs);
    if (typeof this.timer === "object" && "unref" in this.timer) {
      (this.timer as NodeJS.Timeout).unref?.();
    }
    return this.getSnapshot();
  }

  stop(): ContinuousAnalysisRuntimeSnapshot {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.status = "stopped";
    return this.getSnapshot();
  }

  async runCycle(): Promise<ContinuousAnalysisCycleResult> {
    const asOf = new Date().toISOString();
    const cycleId = `cac-${Date.parse(asOf)}`;
    const activation = getStrategyActivationStore();
    const accepted: ContinuousScannerRow[] = [];
    const discarded: ContinuousScannerRow[] = [];
    const conclusionsSample: AgentConclusion[] = [];
    const strategyAnalyses: StrategyAnalysis[] = [];

    let miBlend: ContinuousMiBlend | null = null;
    try {
      if (this.miGather) {
        miBlend = await this.miGather(this.symbols);
      }
    } catch {
      miBlend = null;
    }

    try {
      for (const symbol of this.symbols) {
        const miSym = miBlend?.bySymbol[symbol];
        const context = buildAnalysisContext(symbol, asOf, this.marketDesk, miSym);
        const ecosystem = await runAgentEcosystem({
          context,
          marketDesk: this.marketDesk,
        });
        if (conclusionsSample.length < 8) {
          conclusionsSample.push(...ecosystem.conclusions.slice(0, 3));
        }

        const stratCtx = buildStrategyContext(symbol, asOf, this.regime, miSym);
        const enabledAnalyses = this.strategyEngine.analyzeEnabled(stratCtx, (id: StrategyId) =>
          activation.isEnabled(id),
        );
        strategyAnalyses.push(...enabledAnalyses);

        const hits = enabledAnalyses.filter((a) => Math.abs(a.score) >= 0.25).length;
        const committee = ecosystem.committee;
        const rowBase = {
          id: `${cycleId}-${symbol}`,
          symbol,
          score: Math.max(committee.buy_score, committee.sell_score),
          risk: committee.risks[0] ?? "NO_DATA",
          committeeAction: committee.action,
          committeeConsensus: committee.consensus,
          confidence: committee.confidence,
          explanation: committee.explanation,
          sourcesUsed: [
            ...committee.sourcesUsed,
            miSym?.price != null ? "REAL_MARKET_DATA" : "DEMO_SYNTHETIC",
          ],
          evidence: [
            ...committee.evidence,
            miSym?.price != null ? "PRICE_QUALITY: REAL" : "PRICE_QUALITY: DEMO · NO LIVE PRICE",
          ],
          expectedPortfolioImpact: committee.expectedPortfolioImpact,
          timeHorizon: committee.timeHorizon,
          risks: committee.risks,
          agentCount: ecosystem.conclusions.length,
          enabledStrategyHits: hits,
          dataQuality: miSym?.price != null ? ("REAL" as const) : ("DEMO" as const),
        };

        const accept =
          committee.confidence >= this.minConfidence &&
          (committee.action === "BUY" ||
            committee.action === "SELL" ||
            committee.action === "REDUCE" ||
            committee.action === "EXIT") &&
          hits > 0;

        if (accept) {
          accepted.push({ ...rowBase, status: "accepted" });
        } else {
          discarded.push({
            ...rowBase,
            status: "discarded",
            discardReason:
              hits === 0
                ? "no-enabled-strategy-hit"
                : committee.confidence < this.minConfidence
                  ? "committee-confidence-below-floor"
                  : "committee-hold-or-weak-signal",
          });
        }
      }

      const result: ContinuousAnalysisCycleResult = {
        cycleId,
        generatedAt: asOf,
        symbolsScanned: this.symbols.length,
        accepted,
        discarded,
        conclusionsSample,
        strategyAnalyses: strategyAnalyses.slice(0, 40),
        miProvidersUsed: miBlend?.providersUsed ?? [],
        miDataQuality: miBlend && miBlend.providersUsed.length > 0 ? "live-mi" : "stub-signals",
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        liveTradingEnabled: false,
        autonomousLive: "LOCKED",
        goLive: "NOT_READY_FOR_LIVE",
        ibkrReadOnly: true,
      };

      this.lastResult = result;
      this.lastCycleAt = asOf;
      this.cyclesCompleted += 1;
      this.lastError = null;
      if (this.status !== "stopped") this.status = "running";
      return result;
    } catch (error) {
      this.status = "error";
      this.lastError = error instanceof Error ? error.message : "Continuous analysis cycle failed";
      throw error;
    }
  }
}

let runtimeSingleton: ContinuousAnalysisRuntime | undefined;

export function getContinuousAnalysisRuntime(
  options?: ContinuousAnalysisRuntimeOptions,
): ContinuousAnalysisRuntime {
  if (!runtimeSingleton) {
    runtimeSingleton = new ContinuousAnalysisRuntime(options);
  }
  return runtimeSingleton;
}

export function resetContinuousAnalysisRuntimeForTests(): void {
  if (runtimeSingleton) runtimeSingleton.stop();
  runtimeSingleton = undefined;
}
