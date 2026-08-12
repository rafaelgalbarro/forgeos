import "server-only";

import { getFullMarketAnalysis } from "@/lib/market-data/full-analysis";
import { highConfidencePatterns } from "@/lib/market-data/pattern-recognition";
import type { EnhancedOpportunity } from "@/lib/market-data/types";
import { enrichOpportunitiesWithInstitutional } from "@/lib/market-data/institutional-scanner";
import { aggregateSentiment } from "@/lib/market-data/sentiment-aggregator";
import {
  getMacroContext,
  macroBuyScoreAdjustment,
  type MacroContext,
} from "@/lib/market-data/macro-context";
import {
  analyzeTimeframes,
  applyConfluenceToScore,
} from "@/lib/market-data/multi-timeframe";

const SCAN_UNIVERSE = [
  "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "SPY", "QQQ",
  "ASML", "SAP", "SHEL", "BP", "EZU", "VGK", "TSM", "BABA",
];

function atrLevels(price: number, atrVal: number | null) {
  const a = atrVal && atrVal > 0 ? atrVal : price * 0.02;
  return {
    entry: price,
    stopLoss: price - a * 1.5,
    takeProfit: price + a * 3,
  };
}

/** Scans universe for confluence opportunities (ANALYSIS_ONLY). */
export async function scanEnhancedOpportunities(): Promise<{
  scannedAt: string;
  opportunities: EnhancedOpportunity[];
  scanDurationMs: number;
}> {
  const started = Date.now();
  const opportunities: EnhancedOpportunity[] = [];
  const macroCtx: MacroContext | null = await getMacroContext().catch(() => null);

  for (const ticker of SCAN_UNIVERSE) {
    try {
      const analysis = await getFullMarketAnalysis(ticker);
      const sentiment = await aggregateSentiment(ticker).catch(() => null);
      const mtf = await analyzeTimeframes(ticker).catch(() => null);
      const { technicals, patterns, news, bars } = analysis;
      const signals: string[] = [];
      let score = 0;
      const price = bars.at(-1)?.close ?? 0;
      if (price <= 0) continue;

      const rsiVal = technicals.momentum.rsi;
      if (rsiVal != null && rsiVal < 30) {
        signals.push(`RSI sobreventa (${rsiVal.toFixed(0)})`);
        score += 15;
      }
      if (rsiVal != null && rsiVal > 70) {
        signals.push(`RSI sobrecompra (${rsiVal.toFixed(0)})`);
        score += 12;
      }

      if (technicals.volatility.squeeze?.active) {
        signals.push("Bollinger Squeeze activo");
        score += 18;
      }

      for (const sig of patterns.signals) {
        if (sig.name === "Golden Cross" || sig.name === "Death Cross") {
          signals.push(sig.name);
          score += 20;
        }
      }

      const hc = highConfidencePatterns(patterns);
      for (const p of [...hc.candlesticks, ...hc.price]) {
        signals.push(`${p.name} (${p.confidence}%)`);
        score += Math.round(p.confidence * 0.2);
      }

      const recentNews = news.items.filter((n) => n.hoursAgo <= 2);
      if (recentNews.some((n) => n.sentiment === "POSITIVE")) {
        signals.push("Noticia positiva <2h");
        score += 12;
      }
      if (recentNews.some((n) => n.sentiment === "NEGATIVE")) {
        signals.push("Noticia negativa <2h");
        score += 10;
      }

      const relVol = technicals.volume.relativeVolume;
      if (relVol != null && relVol > 2) {
        signals.push(`Volumen relativo ${relVol.toFixed(1)}x`);
        score += 15;
      }

      if (sentiment) {
        for (const sig of sentiment.signals.slice(0, 4)) {
          signals.push(sig);
        }
        if (sentiment.compositeScore >= 25) score += 12;
        if (sentiment.compositeScore <= -25) score += 10;
        if (sentiment.reddit?.mentionSpike) score += 14;
        if (sentiment.macro.extremeFear && rsiVal != null && rsiVal < 40) score += 10;
        if (sentiment.macro.extremeGreed && rsiVal != null && rsiVal > 60) score += 8;
      }

      if (macroCtx?.riskOff) {
        signals.push("Macro risk-off (TLT↓)");
      }
      if (macroCtx?.strongestSector) {
        signals.push(`Sector fuerte: ${macroCtx.strongestSector.etf}`);
      }

      const prev = bars.at(-2);
      const cur = bars.at(-1);
      if (prev && cur) {
        const gap = Math.abs(cur.open - prev.close) / prev.close;
        if (gap > 0.02) {
          signals.push(`Gap apertura ${(gap * 100).toFixed(1)}%`);
          score += 14;
        }
      }

      if (mtf) {
        signals.push(mtf.confluenceLabel);
        signals.push(`TF primario: ${mtf.primaryTimeframe}`);
        if (mtf.higherTfConfirmation) signals.push("Confirmación TF superiores");
        if (mtf.highConfidence) signals.push("MTF alta confianza (+20%)");
        if (mtf.weakSignal) signals.push("MTF señal débil (1 TF)");
      }

      if (signals.length === 0 || score < 25) continue;

      // Phase K — confluence score boost/penalty
      score = applyConfluenceToScore(score, mtf);

      const levels =
        mtf?.levels && mtf.levels.entry > 0
          ? {
              entry: mtf.levels.entry,
              stopLoss: mtf.levels.stopLoss,
              takeProfit: mtf.levels.takeProfit,
            }
          : atrLevels(price, technicals.volatility.atr);
      const support = technicals.levels.support[0];
      const resistance = technicals.levels.resistance[0];
      if (support != null) levels.stopLoss = Math.min(levels.stopLoss, support * 0.995);
      if (resistance != null && score > 40) levels.takeProfit = Math.max(levels.takeProfit, resistance);

      let side: EnhancedOpportunity["side"] = "HOLD";
      const bullish = signals.filter((s) =>
        /sobreventa|Bullish|Golden|positiva|Bull|Squeeze/i.test(s),
      ).length;
      const bearish = signals.filter((s) =>
        /sobrecompra|Bearish|Death|negativa|Bear/i.test(s),
      ).length;
      if (mtf?.doNotTrade) {
        side = "HOLD";
      } else if (bullish > bearish && score >= 40) side = "BUY";
      else if (bearish > bullish && score >= 40) side = "SELL";

      // Soft: risk-off lightly dampens BUY scores (does not invent signals)
      if (side === "BUY") score += macroBuyScoreAdjustment(macroCtx);

      opportunities.push({
        ticker,
        score: Math.min(100, Math.max(0, score)),
        signals,
        entry: Number(levels.entry.toFixed(2)),
        stopLoss: Number(levels.stopLoss.toFixed(2)),
        takeProfit: Number(levels.takeProfit.toFixed(2)),
        news: news.items.slice(0, 3),
        side,
        confluenceLabel: mtf?.confluenceLabel,
        confluenceRatio: mtf?.confluenceRatio,
        primaryTimeframe: mtf?.primaryTimeframe,
        higherTfConfirmation: mtf?.higherTfConfirmation,
        mtfHighConfidence: mtf?.highConfidence,
        mtfWeakSignal: mtf?.weakSignal,
      });

      console.log(`[EnhancedScanner] ${ticker} score=${score} signals=${signals.join("; ")}`);
    } catch (err) {
      console.warn(`[EnhancedScanner] ${ticker} skip:`, err instanceof Error ? err.message : err);
    }
  }

  opportunities.sort((a, b) => b.score - a.score);
  const enriched = await enrichOpportunitiesWithInstitutional(opportunities);

  return {
    scannedAt: new Date().toISOString(),
    opportunities: enriched,
    scanDurationMs: Date.now() - started,
  };
}
