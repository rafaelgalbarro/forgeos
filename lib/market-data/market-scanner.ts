import "server-only";

import { getFullMarketAnalysis } from "@/lib/market-data/full-analysis";
import type { EnhancedOpportunity, InstitutionalBadge } from "@/lib/market-data/types";
import { getTickerUniverse, getScannerConfig } from "@/lib/market-data/ticker-universe";
import { getActiveCandidateTickers } from "@/lib/market-data/candidate-store";
import {
  computeRsi,
  getBatchPrices,
  getDailyBars,
  getTickerInfo,
  type YahooQuote,
} from "@/lib/market-data/yahoo-finance";
import { GroqAgent, isGroqConfigured, runGroqConcurrent } from "@/lib/ai/groq-agent";
import { ClaudeConfirmationAgent, isClaudeConfirmationConfigured } from "@/lib/ai/claude-confirmation-agent";
import { TRADING_CONFIG } from "@/src/core/trading/trading.config";
import {
  readMultiScannerResults,
  writeMultiScannerResults,
  type MultiScannerPhaseResult,
  type MultiScannerSnapshot,
} from "@/lib/market-data/scanner-store";
import { sendSignalAlert } from "@/lib/notifications/telegram-bot";
import { enrichOpportunitiesWithInstitutional } from "@/lib/market-data/institutional-scanner";
import { aggregateSentiment, sentimentToAgentContext } from "@/lib/market-data/sentiment-aggregator";
import { getDataRefreshPolicy } from "@/lib/market-data/refresh-policy";
import { getMacroContext, macroToAgentContext } from "@/lib/market-data/macro-context";
import {
  analyzeTimeframes,
  applyConfluenceToScore,
  mtfToAgentContext,
} from "@/lib/market-data/multi-timeframe";
import {
  applyMlScannerScoreMultiplier,
  hourEtFromIso,
  recordMlSignal,
} from "@/lib/ml/signal-trainer";

export type Phase1Candidate = {
  ticker: string;
  quote: YahooQuote;
  rsi: number | null;
  relativeVolume: number;
};

function relativeVolume(q: YahooQuote): number {
  const base = q.avgVolume > 0 ? q.avgVolume : q.volume;
  if (base <= 0) return 0;
  return q.volume / base;
}

function notAt52WeekExtreme(q: YahooQuote): boolean {
  if (q.high52w <= 0 || q.low52w <= 0) return true;
  if (q.price >= q.high52w * 0.98) return false;
  if (q.price <= q.low52w * 1.02) return false;
  return true;
}

/** FASE 1 — filtro matemático sobre universo o pool diario. */
export async function runPhase1MathFilter(
  tickers: readonly string[],
  opts?: { minChangePct?: number; minRelVol?: number; skipRsiMidBand?: boolean },
): Promise<Phase1Candidate[]> {
  const started = Date.now();
  const quotes = await getBatchPrices(tickers);
  const preFiltered: Phase1Candidate[] = [];
  const minChange = opts?.minChangePct ?? 2.0;
  const minRel = opts?.minRelVol ?? 1.5;
  const minAbsVolume = 1_000_000;

  for (const [ticker, quote] of quotes) {
    if (Math.abs(quote.changePct) < minChange) continue;
    if ((quote.volume ?? 0) < minAbsVolume) continue;
    const rel = relativeVolume(quote);
    if (rel < minRel) continue;
    if (minChange >= 1.5 && !notAt52WeekExtreme(quote)) continue;
    preFiltered.push({ ticker, quote, rsi: null, relativeVolume: rel });
  }

  preFiltered.sort((a, b) => Math.abs(b.quote.changePct) - Math.abs(a.quote.changePct));
  const cap = getScannerConfig().maxPhase2;
  const top = preFiltered.slice(0, Math.min(cap * 2, 120));

  const withRsi: Phase1Candidate[] = [];
  for (const c of top) {
    const bars = await getDailyBars(c.ticker);
    const closes = bars.map((b) => b.close);
    const rsi = computeRsi(closes);
    if (rsi == null) continue;
    // Keep RSI 30–40 (oversold at support). Drop only the mid-band on full-universe scans.
    if (!opts?.skipRsiMidBand && rsi > 40 && rsi < 60) continue;
    withRsi.push({ ...c, rsi });
    if (withRsi.length >= cap) break;
  }

  console.log(
    `[MarketScanner] Fase 1: ${withRsi.length} candidatos de ${tickers.length} (${Date.now() - started}ms)`,
  );
  return withRsi;
}

/** FASE 2 — Groq scoring en paralelo. */
export async function runPhase2GroqScoring(candidates: readonly Phase1Candidate[]) {
  if (!isGroqConfigured()) {
    console.warn("[MarketScanner] Fase 2 omitida — GROQ_API_KEY no configurada");
    return candidates.map((c) => ({
      ticker: c.ticker,
      score: Math.min(
        100,
        Math.abs(c.quote.changePct) * 10 +
          (c.rsi != null && c.rsi >= 30 && c.rsi <= 40 ? 15 : c.rsi != null && (c.rsi < 30 || c.rsi > 70) ? 10 : 0),
      ),
      direction: (c.rsi != null && c.rsi < 35 ? "BUY" : c.rsi != null && c.rsi > 65 ? "SELL" : "HOLD") as "BUY" | "SELL" | "HOLD",
      reasoning: `Math fallback RSI=${c.rsi?.toFixed(0) ?? "N/A"}`,
      patternName: undefined,
      candidate: c,
    }));
  }

  const groq = new GroqAgent();
  const maxConcurrent = TRADING_CONFIG.aiProviders?.groq?.maxConcurrent ?? 10;
  const scored = await runGroqConcurrent(candidates, maxConcurrent, async (c) => {
    const s = await groq.scoreCandidate({
      ticker: c.ticker,
      price: c.quote.price,
      changePct: c.quote.changePct,
      rsi: c.rsi,
      relativeVolume: c.relativeVolume,
    });
    return { ...s, candidate: c };
  });

  scored.sort((a, b) => b.score - a.score);
  const top10 = scored.slice(0, 10);
  console.log(`[MarketScanner] Fase 2: top=${top10.map((s) => `${s.ticker}:${s.score}`).join(", ")}`);
  return scored;
}

function atrLevels(price: number, atr: number | null) {
  const a = atr && atr > 0 ? atr : price * 0.02;
  return {
    entry: price,
    stopLoss: Number((price - a * 1.5).toFixed(2)),
    takeProfit: Number((price + a * 3).toFixed(2)),
  };
}

/** FASE 3 — confirmación Claude Haiku (fallback Groq). */
export async function runPhase3Confirmation(
  topCandidates: Array<Awaited<ReturnType<typeof runPhase2GroqScoring>>[number]>,
) {
  const cfg = getScannerConfig();
  const confirmList = topCandidates.filter((c) => c.score >= 70).slice(0, cfg.maxPhase3);
  const opportunities: EnhancedOpportunity[] = [];
  const phases: MultiScannerPhaseResult[] = [];
  const macroCtx = await getMacroContext().catch(() => null);
  const macroAgent = macroCtx ? macroToAgentContext(macroCtx) : undefined;

  for (const item of confirmList) {
    try {
      const analysis = await getFullMarketAnalysis(item.ticker);
      const sentimentAgg = await aggregateSentiment(item.ticker).catch(() => null);
      const mtf = await analyzeTimeframes(item.ticker).catch(() => null);
      const price = analysis.bars.at(-1)?.close ?? item.candidate.quote.price;
      const levels =
        mtf?.levels && mtf.levels.entry > 0
          ? {
              entry: mtf.levels.entry,
              stopLoss: mtf.levels.stopLoss,
              takeProfit: mtf.levels.takeProfit,
            }
          : atrLevels(price, analysis.technicals.volatility.atr);

      let signal = {
        direction: item.direction,
        confidence: item.score / 100,
        reasoning: item.reasoning,
        suggestedLimitPrice: price,
      };

      if (isClaudeConfirmationConfigured() && TRADING_CONFIG.aiProviders?.claude?.onlyForConfirmation) {
        const agent = new ClaudeConfirmationAgent();
        const confirmed = await agent.confirmSignal({
          ticker: item.ticker,
          currentPrice: price,
          change1d: item.candidate.quote.changePct,
          high52w: item.candidate.quote.high52w,
          low52w: item.candidate.quote.low52w,
          volume: item.candidate.quote.volume,
          bid: item.candidate.quote.bid,
          ask: item.candidate.quote.ask,
          news: {
            items: analysis.news.items.map((n) => ({
              title: n.title,
              source: n.source,
              sentiment: n.sentiment,
              hoursAgo: n.hoursAgo,
            })),
            overallSentiment: analysis.news.overallSentiment,
            newsCount24h: analysis.news.newsCount24h,
          },
          technicals: {
            trend: {
              ema20: analysis.technicals.trend.ema20,
              ema50: analysis.technicals.trend.ema50,
              ema200: analysis.technicals.trend.ema200,
              macd: analysis.technicals.trend.macd,
              ichimoku: analysis.technicals.trend.ichimoku
                ? {
                    aboveCloud: analysis.technicals.trend.ichimoku.aboveCloud,
                    tenkan: analysis.technicals.trend.ichimoku.tenkan,
                    kijun: analysis.technicals.trend.ichimoku.kijun,
                  }
                : null,
              adx: analysis.technicals.trend.adx,
            },
            momentum: analysis.technicals.momentum,
            volatility: {
              bollingerBands: analysis.technicals.volatility.bollingerBands,
              atr: analysis.technicals.volatility.atr,
              squeeze: analysis.technicals.volatility.squeeze,
            },
            volume: {
              vwap: analysis.technicals.volume.vwap,
              obv: analysis.technicals.volume.obv,
              relativeVolume: analysis.technicals.volume.relativeVolume,
            },
            levels: {
              fibonacci: [...analysis.technicals.levels.fibonacci],
              support: [...analysis.technicals.levels.support],
              resistance: [...analysis.technicals.levels.resistance],
            },
          },
          patterns: {
            candlesticks: [...analysis.patterns.candlesticks],
            price: [...analysis.patterns.price],
            divergences: [...analysis.patterns.divergences],
            signals: [...analysis.patterns.signals],
          },
          sentiment: sentimentAgg ? sentimentToAgentContext(sentimentAgg) : undefined,
          macro: macroAgent,
          multiTimeframe: mtf ? mtfToAgentContext(mtf) : undefined,
          portfolioContext: { navUSD: 10_000, cashUSD: 10_000, dailyPnlUSD: 0 },
        });
        signal = {
          direction: confirmed.direction,
          confidence: confirmed.confidence,
          reasoning: confirmed.reasoning,
          suggestedLimitPrice: confirmed.suggestedLimitPrice ?? price,
        };
      }

      // Phase K — weak MTF → HOLD; high confluence → confidence boost
      if (mtf?.doNotTrade) {
        signal = {
          ...signal,
          direction: "HOLD",
          reasoning: `${signal.reasoning} | ${mtf.confluenceLabel} débil`,
        };
      } else if (mtf?.highConfidence && signal.direction !== "HOLD") {
        signal = {
          ...signal,
          confidence: Math.min(1, Number((signal.confidence * 1.2).toFixed(3))),
        };
      }

      const side =
        signal.direction === "BUY" || signal.direction === "SELL" ? signal.direction : "HOLD";

      const baseScore = Math.round(
        item.score + (sentimentAgg ? Math.min(15, Math.max(-10, sentimentAgg.compositeScore / 5)) : 0),
      );
      let score = applyConfluenceToScore(baseScore, mtf);

      const rsiVal = analysis.technicals.momentum.rsi;
      const nowIso = new Date().toISOString();
      score = applyMlScannerScoreMultiplier({
        baseScore: score,
        hourEt: hourEtFromIso(nowIso),
        vix: macroCtx?.vix.price ?? null,
        flags: {
          rsiOversold: rsiVal != null && rsiVal < 30,
          rsiOverbought: rsiVal != null && rsiVal > 70,
          squeeze: !!analysis.technicals.volatility.squeeze?.active,
          goldenCross: /golden/i.test(item.patternName ?? ""),
          deathCross: /death/i.test(item.patternName ?? ""),
          volumeSpike: (analysis.technicals.volume.relativeVolume ?? 0) > 2,
        },
      });

      const opp: EnhancedOpportunity = {
        ticker: item.ticker,
        score,
        signals: [
          `Groq ${item.score}`,
          item.patternName ? `Patrón: ${item.patternName}` : "",
          signal.reasoning,
          ...(mtf ? [mtf.confluenceLabel, `TF primario: ${mtf.primaryTimeframe}`] : []),
          ...(mtf?.higherTfConfirmation ? ["Confirmación TF superiores"] : []),
          ...(sentimentAgg?.signals.slice(0, 2) ?? []),
          ...(macroCtx?.riskOff ? ["Macro risk-off (TLT↓)"] : []),
        ].filter(Boolean),
        entry: levels.entry,
        stopLoss: levels.stopLoss,
        takeProfit: levels.takeProfit,
        news: analysis.news.items.slice(0, 3),
        side,
        confluenceLabel: mtf?.confluenceLabel,
        confluenceRatio: mtf?.confluenceRatio,
        primaryTimeframe: mtf?.primaryTimeframe,
        higherTfConfirmation: mtf?.higherTfConfirmation,
        mtfHighConfidence: mtf?.highConfidence,
        mtfWeakSignal: mtf?.weakSignal,
      };
      opportunities.push(opp);

      if (side === "BUY" || side === "SELL") {
        void getTickerInfo(item.ticker)
          .then((info) => {
            recordMlSignal({
              ticker: item.ticker,
              direction: side,
              confidence: signal.confidence,
              pattern: item.patternName ?? null,
              sector: info?.sector ?? null,
              vix: macroCtx?.vix.price ?? null,
              source: "market-scanner",
              indicators: {
                rsi: rsiVal,
                squeezeActive: !!analysis.technicals.volatility.squeeze?.active,
                relativeVolume: analysis.technicals.volume.relativeVolume ?? null,
                goldenCross: /golden/i.test(item.patternName ?? ""),
                deathCross: /death/i.test(item.patternName ?? ""),
              },
            });
          })
          .catch(() => undefined);
      }

      phases.push({
        phase: 3,
        ticker: item.ticker,
        score: item.score,
        direction: side,
        confidence: signal.confidence,
        reasoning: signal.reasoning,
        entry: levels.entry,
        stopLoss: levels.stopLoss,
        takeProfit: levels.takeProfit,
      });

      if (side !== "HOLD" && signal.confidence >= TRADING_CONFIG.ai.minConfidenceToTrade) {
        void sendSignalAlert({
          ticker: item.ticker,
          direction: side,
          entry: levels.entry,
          stopLoss: levels.stopLoss,
          takeProfit: levels.takeProfit,
          confidence: signal.confidence,
          newsSentiment: analysis.news.overallSentiment,
          rsi: analysis.technicals.momentum.rsi,
          patternName: item.patternName,
        }).catch((err) => console.warn("[MarketScanner] Telegram:", err));
      }
    } catch (err) {
      console.warn(`[MarketScanner] Fase 3 ${item.ticker}:`, err instanceof Error ? err.message : err);
    }
  }

  return { opportunities, phases };
}

function applyTapeAndRsiScoring<
  T extends {
    ticker: string;
    score: number;
    signals: readonly string[];
    badges?: readonly InstitutionalBadge[];
  },
>(opps: T[], phase1: readonly Phase1Candidate[]): T[] {
  const byTicker = new Map(phase1.map((c) => [c.ticker, c]));
  return opps.map((opp) => {
    const c = byTicker.get(opp.ticker);
    if (!c) return opp;
    const extraBadges: InstitutionalBadge[] = [];
    const extraSignals: string[] = [];
    let delta = 0;
    const gap = Math.abs(c.quote.changePct);
    if (gap >= 3 && c.relativeVolume >= 1.5) {
      extraBadges.push(c.quote.changePct >= 0 ? "GAP UP" : "GAP DOWN");
      delta += 20;
      extraSignals.push(`Gap ${c.quote.changePct.toFixed(1)}% vol ${c.relativeVolume.toFixed(1)}x`);
    }
    if (c.relativeVolume >= 3) {
      extraBadges.push("MOMENTUM");
      extraSignals.push(`Volumen ${c.relativeVolume.toFixed(1)}x media`);
    }
    if (c.rsi != null && c.rsi >= 30 && c.rsi <= 40) {
      delta += 15;
      extraSignals.push(`RSI oversold ${c.rsi.toFixed(0)} en soporte`);
    }
    if (delta === 0 && extraBadges.length === 0) return opp;
    return {
      ...opp,
      score: Math.max(0, Math.min(100, Math.round(opp.score + delta))),
      signals: [...opp.signals, ...extraSignals],
      badges: [...new Set([...(opp.badges ?? []), ...extraBadges])],
    };
  });
}

async function applyVixGlobalPenalty<T extends { score: number; signals: readonly string[] }>(
  opps: T[],
): Promise<T[]> {
  const macro = await getMacroContext().catch(() => null);
  const vix = macro?.vix.price ?? null;
  if (vix == null || vix <= 30) return opps;
  return opps.map((opp) => ({
    ...opp,
    score: Math.max(0, Math.round(opp.score - 10)),
    signals: [...opp.signals, `VIX ${vix.toFixed(0)} > 30`],
  }));
}

/** Pipeline completo 3 fases. */
export async function runMultiPhaseMarketScan(): Promise<MultiScannerSnapshot> {
  const started = Date.now();
  const errors: string[] = [];
  const phases: MultiScannerPhaseResult[] = [];
  const policy = getDataRefreshPolicy();

  if (policy.isWeekend) {
    const disk = getMultiScannerSnapshot();
    if (disk) {
      return {
        ...disk,
        scannedAt: disk.scannedAt,
        scanDurationMs: Date.now() - started,
        errors: [...(disk.errors ?? []), "weekend: serving Friday disk cache"],
      };
    }
  }

  let universeSize = 0;
  let phase1: Phase1Candidate[] = [];

  try {
    const pool = getActiveCandidateTickers();
    const universe = pool.length >= 10 ? null : await getTickerUniverse();
    let tickers = pool.length >= 10 ? pool : universe!.tickers;
    if (policy.scannerUniverseCap != null) {
      tickers = tickers.slice(0, policy.scannerUniverseCap);
    }
    universeSize = universe?.tickers.length ?? pool.length;
    phase1 = await runPhase1MathFilter(
      tickers,
      pool.length >= 10
        ? { minChangePct: 0.3, minRelVol: 0.8, skipRsiMidBand: true }
        : undefined,
    );
    console.log(
      `[MarketScanner] pool=${pool.length} scanning=${tickers.length} cap=${policy.scannerUniverseCap ?? "full"} (daily candidates ${pool.length >= 10 ? "ON" : "fallback universe"})`,
    );
    for (const c of phase1) {
      phases.push({
        phase: 1,
        ticker: c.ticker,
        rsi: c.rsi,
        changePct: c.quote.changePct,
        relativeVolume: c.relativeVolume,
      });
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Fase 1 failed");
  }

  let phase2 = await runPhase2GroqScoring(phase1);
  for (const s of phase2.slice(0, getScannerConfig().maxPhase2)) {
    phases.push({
      phase: 2,
      ticker: s.ticker,
      score: s.score,
      direction: s.direction,
      reasoning: s.reasoning,
      patternName: s.patternName,
    });
  }

  const topForPhase3 = phase2.slice(0, getScannerConfig().maxPhase3);
  const { opportunities, phases: phase3Rows } = await runPhase3Confirmation(topForPhase3);
  phases.push(...phase3Rows);

  opportunities.sort((a, b) => b.score - a.score);

  const enriched = applyTapeAndRsiScoring(
    await enrichOpportunitiesWithInstitutional(opportunities),
    phase1,
  );
  const withVix = await applyVixGlobalPenalty(enriched);

  const snapshot: MultiScannerSnapshot = {
    scannedAt: new Date().toISOString(),
    scanDurationMs: Date.now() - started,
    universeSize,
    phase1Count: phase1.length,
    phase2Count: Math.min(phase2.length, getScannerConfig().maxPhase2),
    phase3Count: withVix.length,
    opportunities: withVix,
    phases,
    errors,
  };

  writeMultiScannerResults(snapshot);
  console.log(
    `[MarketScanner] Completo ${snapshot.scanDurationMs}ms — P1=${snapshot.phase1Count} P2=${snapshot.phase2Count} P3=${snapshot.phase3Count}`,
  );
  return snapshot;
}

export function getMultiScannerSnapshot(): MultiScannerSnapshot | null {
  return readMultiScannerResults();
}
