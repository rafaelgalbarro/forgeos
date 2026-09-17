/**
 * World-class multi-agent signal helpers for ForgeOS trading.
 */

import "server-only";

import { getBatchQuotes } from "@/lib/market-data/eodhd";
import {
  atr,
  bollinger,
  closes,
  ema,
  macd,
  relativeVolume,
  rsi,
} from "@/lib/market-data/technical-indicators";
import type { OhlcvBar } from "@/lib/market-data/types";
import {
  DEFENSIVE_TICKERS,
  SECTOR_ROTATION_MAP,
  sectorForSymbol,
} from "@/lib/trading/usa-sectors";
import {
  getCurrentTradingPhase,
  minConfidenceForForgePhase,
  type ForgeTradingPhase,
} from "@/lib/trading/cycle-schedule";

export type AgentSignal = {
  agent: string;
  action: "STRONG_BUY" | "BUY" | "WATCH" | "SHORT_WATCH" | "HOLD";
  confidenceBoost: number;
  confidence?: number;
  reason: string;
};

/** AGENTE 1 — Momentum (intraday refund_1d_p + volume). */
export function runMomentumAgent(input: {
  changePct: number;
  volume: number;
  avgVolume: number;
  rsi: number | null;
}): AgentSignal {
  const { changePct, volume, avgVolume, rsi: rsiVal } = input;
  const volRatio = avgVolume > 0 ? volume / avgVolume : 1;

  if (changePct > 2 && volRatio > 2) {
    return {
      agent: "MOMENTUM",
      action: "STRONG_BUY",
      confidence: 0.78,
      confidenceBoost: 0.78,
      reason: `Momentum STRONG_BUY Δ${changePct.toFixed(1)}% vol=${volRatio.toFixed(1)}x`,
    };
  }
  if (changePct >= 0.5 && changePct <= 2 && (rsiVal == null || rsiVal < 60)) {
    return {
      agent: "MOMENTUM",
      action: "BUY",
      confidence: 0.65,
      confidenceBoost: 0.65,
      reason: `Momentum BUY Δ${changePct.toFixed(1)}% RSI=${rsiVal?.toFixed(0) ?? "—"}`,
    };
  }
  if (changePct >= 0 && changePct < 0.5) {
    return {
      agent: "MOMENTUM",
      action: "WATCH",
      confidenceBoost: 0,
      reason: `Momentum WATCH Δ${changePct.toFixed(1)}%`,
    };
  }
  if (changePct < -2) {
    return {
      agent: "MOMENTUM",
      action: "SHORT_WATCH",
      confidenceBoost: 0.05,
      reason: `Momentum SHORT_WATCH Δ${changePct.toFixed(1)}% (rebote)`,
    };
  }
  return {
    agent: "MOMENTUM",
    action: "HOLD",
    confidenceBoost: 0,
    reason: "Momentum HOLD",
  };
}

/** AGENTE 2 — Technical (EMA/BB/MACD/RSI/volume on EOD bars). */
export function runTechnicalAgent(price: number, bars: readonly OhlcvBar[]): AgentSignal {
  if (bars.length < 50) {
    return {
      agent: "TECHNICAL",
      action: "HOLD",
      confidenceBoost: 0,
      reason: "Technical: barras insuficientes",
    };
  }

  const c = closes(bars);
  const ema9 = ema(c, 9);
  const ema21 = ema(c, 21);
  const ema50 = ema(c, 50);
  const macdVal = macd(c);
  const rsiVal = rsi(c, 14);
  const bb = bollinger(c, 20, 2);
  const relVol = relativeVolume(bars, 20) ?? 1;

  let boost = 0;
  const parts: string[] = [];

  if (ema9 != null && ema21 != null && ema50 != null && ema9 > ema21 && ema21 > ema50) {
    boost += 0.15;
    parts.push("EMA9>21>50");
  }
  if (bb != null && price < bb.lower) {
    boost += 0.2;
    parts.push("BB oversold");
  }
  if (macdVal && macdVal.line > macdVal.signal) {
    boost += 0.12;
    parts.push("MACD↑");
  }
  if (rsiVal != null && rsiVal < 35) {
    boost += 0.18;
    parts.push(`RSI=${rsiVal.toFixed(0)}`);
  }
  if (relVol > 1.5) {
    boost += 0.08;
    parts.push(`vol ${relVol.toFixed(1)}x`);
  }

  const confidence = Math.min(0.95, boost);
  const action: AgentSignal["action"] =
    confidence >= 0.45 ? "BUY" : confidence >= 0.2 ? "WATCH" : "HOLD";

  return {
    agent: "TECHNICAL",
    action,
    confidenceBoost: confidence,
    confidence,
    reason: parts.length ? `Technical ${parts.join("+")}` : "Technical flat",
  };
}

type SectorEtfSnapshot = { changePct: number };

let sectorEtfCache: { at: number; map: Map<string, SectorEtfSnapshot> } | null = null;
const SECTOR_ETF_TTL_MS = 3 * 60_000;

async function loadSectorEtfChanges(): Promise<Map<string, SectorEtfSnapshot>> {
  if (sectorEtfCache && Date.now() - sectorEtfCache.at < SECTOR_ETF_TTL_MS) {
    return sectorEtfCache.map;
  }
  const symbols = ["XLK", "XLF", "XLE", "VXX", "SPY"];
  const quotes = await getBatchQuotes(symbols);
  const map = new Map<string, SectorEtfSnapshot>();
  for (const sym of symbols) {
    const q = quotes.get(sym);
    map.set(sym, { changePct: q?.changePercentage ?? 0 });
  }
  sectorEtfCache = { at: Date.now(), map };
  return map;
}

/** AGENTE 3 — Sector rotation via sector ETFs. */
export async function runSectorRotationAgent(symbol: string): Promise<{
  signal: AgentSignal;
  defensiveOnly: boolean;
  priorityBoost: boolean;
}> {
  const etfs = await loadSectorEtfChanges();
  const vxx = etfs.get("VXX")?.changePct ?? 0;
  if (vxx > 5) {
    const defensive = (DEFENSIVE_TICKERS as readonly string[]).includes(symbol.toUpperCase());
    return {
      defensiveOnly: true,
      priorityBoost: defensive,
      signal: {
        agent: "SECTOR",
        action: defensive ? "BUY" : "HOLD",
        confidenceBoost: defensive ? 0.05 : -0.15,
        reason: `VXX +${vxx.toFixed(1)}% → modo defensivo`,
      },
    };
  }

  let boost = 0;
  const reasons: string[] = [];
  for (const [etf, names] of Object.entries(SECTOR_ROTATION_MAP)) {
    const ch = etfs.get(etf)?.changePct ?? 0;
    const threshold = etf === "XLE" ? 1.5 : 1;
    if (ch > threshold && (names as readonly string[]).includes(symbol.toUpperCase())) {
      boost += 0.05;
      reasons.push(`${etf}+${ch.toFixed(1)}%→${symbol}`);
    }
  }

  const sector = sectorForSymbol(symbol);
  const sectorEtf =
    sector === "Technology"
      ? "XLK"
      : sector === "Financials"
        ? "XLF"
        : sector === "Energy"
          ? "XLE"
          : sector === "Healthcare"
            ? "XLV"
            : null;
  if (sectorEtf) {
    const ch = etfs.get(sectorEtf)?.changePct ?? 0;
    if (ch > 0.5) {
      boost += 0.05;
      reasons.push(`${sectorEtf} alcista`);
    } else if (ch < -0.5) {
      boost -= 0.05;
      reasons.push(`${sectorEtf} bajista`);
    }
  }

  return {
    defensiveOnly: false,
    priorityBoost: boost > 0,
    signal: {
      agent: "SECTOR",
      action: boost > 0 ? "BUY" : boost < 0 ? "WATCH" : "HOLD",
      confidenceBoost: boost,
      reason: reasons[0] ?? "Sector neutral",
    },
  };
}

/** AGENTE 4 — Crypto scalp on 4H bars. */
export function runCryptoScalpAgent(price: number, bars4h: readonly OhlcvBar[]): {
  signal: AgentSignal;
  stopLoss: number;
  takeProfit: number;
} {
  const c = closes(bars4h);
  const rsiVal = rsi(c, 14);
  const ema9 = ema(c, 9);
  const ema21 = ema(c, 21);
  const atrVal = atr(bars4h, 14) ?? price * 0.02;
  const relVol = relativeVolume(bars4h, 20) ?? 1;
  const stopLoss = price - atrVal * 1.5;
  const takeProfit = price + atrVal * 3.0;

  if (rsiVal != null && rsiVal > 75) {
    return {
      signal: {
        agent: "CRYPTO_SCALP",
        action: "HOLD",
        confidence: 0,
        confidenceBoost: 0,
        reason: `Crypto RSI4H=${rsiVal.toFixed(0)} overbought`,
      },
      stopLoss,
      takeProfit,
    };
  }

  let conf = 0;
  let action: AgentSignal["action"] = "HOLD";
  let reason = "Crypto flat";

  if (rsiVal != null && rsiVal < 35) {
    conf = 0.78;
    action = "STRONG_BUY";
    reason = `Crypto STRONG_BUY RSI4H=${rsiVal.toFixed(0)}`;
  } else if (rsiVal != null && rsiVal < 45 && ema9 != null && ema21 != null && ema9 > ema21) {
    conf = 0.62;
    action = "BUY";
    reason = `Crypto BUY RSI4H=${rsiVal.toFixed(0)} EMA9>21`;
  } else if (
    ema21 != null &&
    bars4h.length >= 2 &&
    bars4h[bars4h.length - 2]!.close < ema21 &&
    price > ema21
  ) {
    conf = 0.58;
    action = "BUY";
    reason = "Crypto BUY cruce EMA21 4H";
  }

  if (conf > 0 && relVol > 2) {
    conf = Math.min(0.95, conf * 1.1);
    reason += ` vol×${relVol.toFixed(1)}`;
  }

  return {
    signal: {
      agent: "CRYPTO_SCALP",
      action,
      confidence: conf,
      confidenceBoost: conf,
      reason,
    },
    stopLoss,
    takeProfit,
  };
}

/** AGENTE 5 — Risk manager (transversal). */
export type RiskManagerState = {
  openPositions: number;
  maxOpenPositions: number;
  dailyPnlPct: number;
  sectorOpenCount: Map<string, number>;
  tickerExposurePct: number;
};

export function runRiskManagerAgent(
  symbol: string,
  confidence: number,
  capitalUSD: number,
  state: RiskManagerState,
): {
  allow: boolean;
  reason: string;
  minConfidence: number;
  positionSizeUSD: number;
  haltTrading: boolean;
  conservative: boolean;
} {
  const phase = getCurrentTradingPhase();
  let minConf = minConfidenceForForgePhase(phase);
  let conservative = false;
  let haltTrading = false;

  if (state.dailyPnlPct <= -5) {
    haltTrading = true;
    return {
      allow: false,
      reason: "Risk STOP: drawdown día > 5%",
      minConfidence: 1,
      positionSizeUSD: 0,
      haltTrading: true,
      conservative: true,
    };
  }
  if (state.dailyPnlPct <= -3) {
    conservative = true;
    minConf = 0.8;
  }

  if (state.openPositions >= state.maxOpenPositions) {
    return {
      allow: false,
      reason: `Risk: max ${state.maxOpenPositions} posiciones abiertas`,
      minConfidence: minConf,
      positionSizeUSD: 0,
      haltTrading,
      conservative,
    };
  }

  if (state.tickerExposurePct > 0.2) {
    return {
      allow: false,
      reason: "Risk: exposición ticker > 20%",
      minConfidence: minConf,
      positionSizeUSD: 0,
      haltTrading,
      conservative,
    };
  }

  const sector = sectorForSymbol(symbol);
  if (sector && (state.sectorOpenCount.get(sector) ?? 0) >= 2) {
    return {
      allow: false,
      reason: `Risk: correlación sectorial ${sector} (≥2 posiciones)`,
      minConfidence: minConf,
      positionSizeUSD: 0,
      haltTrading,
      conservative,
    };
  }

  // Kelly simplificado: (confianza - 0.5) * 2 * capital, capped 20%
  const kellyFrac = Math.max(0, Math.min(0.2, (confidence - 0.5) * 2));
  const positionSizeUSD = capitalUSD * kellyFrac;

  return {
    allow: confidence >= minConf,
    reason: conservative ? "Risk modo conservador (DD>3%)" : "Risk OK",
    minConfidence: minConf,
    positionSizeUSD,
    haltTrading,
    conservative,
  };
}

/** Combine momentum + technical + sector into a composite confidence. */
export async function combineEquityAgents(input: {
  symbol: string;
  price: number;
  changePct: number;
  volume: number;
  avgVolume: number;
  bars: readonly OhlcvBar[];
  rsi: number | null;
}): Promise<{
  confidence: number;
  agents: string[];
  reasoning: string;
  direction: "BUY" | "HOLD";
  defensiveBlock: boolean;
}> {
  const mom = runMomentumAgent({
    changePct: input.changePct,
    volume: input.volume,
    avgVolume: input.avgVolume,
    rsi: input.rsi,
  });
  const tech = runTechnicalAgent(input.price, input.bars);
  const sector = await runSectorRotationAgent(input.symbol);

  if (sector.defensiveOnly && !(DEFENSIVE_TICKERS as readonly string[]).includes(input.symbol)) {
    return {
      confidence: 0,
      agents: [mom.agent, tech.agent, sector.signal.agent],
      reasoning: sector.signal.reason,
      direction: "HOLD",
      defensiveBlock: true,
    };
  }

  const buyish =
    mom.action === "STRONG_BUY" ||
    mom.action === "BUY" ||
    tech.action === "BUY" ||
    mom.action === "SHORT_WATCH";

  const parts = [mom, tech, sector.signal].filter(
    (s) => s.confidenceBoost > 0 || (s.confidence ?? 0) > 0,
  );
  const raw =
    Math.max(mom.confidence ?? 0, tech.confidence ?? 0, 0) +
    (sector.signal.confidenceBoost > 0 ? sector.signal.confidenceBoost : 0);
  // Prefer max of primary agents + additive sector, capped
  const confidence = Math.min(
    0.95,
    Math.max(mom.confidence ?? 0, tech.confidenceBoost) +
      (sector.signal.confidenceBoost > 0 ? Math.min(0.1, sector.signal.confidenceBoost) : 0) +
      (mom.action === "STRONG_BUY" && tech.action === "BUY" ? 0.05 : 0),
  );

  const agents = ["MOMENTUM", "TECHNICAL", "SECTOR"].filter((_, i) => {
    const s = [mom, tech, sector.signal][i]!;
    return (s.confidence ?? s.confidenceBoost) > 0 || s.action === "BUY" || s.action === "STRONG_BUY";
  });

  const reasoning = [mom.reason, tech.reason, sector.signal.reason]
    .filter(Boolean)
    .join(" | ");

  return {
    confidence: buyish ? Math.max(confidence, raw > 0 ? Math.min(0.95, raw) : 0) : 0,
    agents: agents.length ? agents : ["MOMENTUM", "TECHNICAL"],
    reasoning,
    direction: buyish && confidence >= 0.5 ? "BUY" : "HOLD",
    defensiveBlock: false,
  };
}

export function phaseLabelForTelegram(phase?: ForgeTradingPhase): string {
  const p = phase ?? getCurrentTradingPhase();
  switch (p) {
    case "USA_REGULAR":
      return "🇺🇸 USA";
    case "EUROPA":
      return "🇪🇺 EUROPA";
    case "ASIA":
      return "🇯🇵 ASIA";
    case "PRE_MARKET":
      return "🌅 PRE-MARKET";
    default:
      return "⏸ CLOSED";
  }
}
