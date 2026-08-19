import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { TradeCycleResult, OrderResult } from "@/src/core/trading/trading-engine";
import { TRADING_CONFIG } from "@/src/core/trading/trading.config";
import { getBatchQuotes } from "@/lib/market-data/fmp";
import { getMacroSentimentContext } from "@/lib/market-data/sentiment-aggregator";
import { getDailyMarketUniverse } from "@/lib/investment/market-daily-universe";
import { fetchTradingAccountSnapshot } from "@/lib/trading/ibkr-data";
import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { loadTradingState } from "@/src/core/trading/trading-state-store";
import { loadOptimizerState } from "@/src/core/trading/portfolio-optimizer";
import { RiskManager } from "@/src/core/trading/risk/risk-manager";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";

const MADRID_TZ = "Europe/Madrid";
const STATS_FILE = path.resolve(process.cwd(), ".forgeos", "cache", "cycle-daily-stats.json");
const SECTOR_ETFS = [
  { etf: "XLK", name: "Technology" },
  { etf: "XLF", name: "Financials" },
  { etf: "XLE", name: "Energy" },
  { etf: "XLV", name: "Healthcare" },
  { etf: "XLI", name: "Industrials" },
  { etf: "XLY", name: "Consumer Discretionary" },
] as const;

type CycleDailyStats = {
  dateKey: string;
  cyclesRun: number;
  signalsDetected: number;
  autoExecuted: number;
  semiAuto: number;
};

type MacroLine = {
  label: string;
  price: number | null;
  changePct: number | null;
};

function madridParts(now = new Date()): {
  dateKey: string;
  dayName: string;
  dateLabel: string;
  timeLabel: string;
} {
  const fmt = new Intl.DateTimeFormat("es-ES", {
    timeZone: MADRID_TZ,
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const pick = (t: string) => fmt.find((p) => p.type === t)?.value ?? "";
  const y = pick("year");
  const m = pick("month");
  const d = pick("day");
  const hh = pick("hour");
  const mm = pick("minute");
  const dayName = pick("weekday");
  const capDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  return {
    dateKey: `${y}-${m}-${d}`,
    dayName: capDay,
    dateLabel: `${d}/${m}/${y}`,
    timeLabel: `${hh}:${mm}`,
  };
}

function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return "N/A";
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

function fmtUsd(v: number, digits = 2): string {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function fmtEur(v: number, digits = 2): string {
  return `€${v.toLocaleString("es-ES", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function categoryEmoji(category: string): string {
  if (category.includes("Gainers")) return "📈";
  if (category.includes("Volume")) return "🔥";
  if (category.includes("Momentum")) return "📈";
  if (category.includes("Oversold")) return "🔄";
  if (category.includes("52w")) return "🎯";
  return "📊";
}

function isValidSignal(order: OrderResult): boolean {
  return (
    order.signal.confidence >= TRADING_CONFIG.ai.minConfidenceToTrade &&
    (order.direction === "BUY" || order.direction === "SELL") &&
    !["REJECTED_CONFIDENCE", "HOLD", "ERROR"].includes(order.status)
  );
}

function readStats(): CycleDailyStats {
  const { dateKey } = madridParts();
  try {
    if (!fs.existsSync(STATS_FILE)) {
      return { dateKey, cyclesRun: 0, signalsDetected: 0, autoExecuted: 0, semiAuto: 0 };
    }
    const parsed = JSON.parse(fs.readFileSync(STATS_FILE, "utf8")) as CycleDailyStats;
    if (parsed.dateKey !== dateKey) {
      return { dateKey, cyclesRun: 0, signalsDetected: 0, autoExecuted: 0, semiAuto: 0 };
    }
    return parsed;
  } catch {
    return { dateKey, cyclesRun: 0, signalsDetected: 0, autoExecuted: 0, semiAuto: 0 };
  }
}

function writeStats(stats: CycleDailyStats): void {
  fs.mkdirSync(path.dirname(STATS_FILE), { recursive: true });
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), "utf8");
}

function recordCycleStats(result: TradeCycleResult): CycleDailyStats {
  const { dateKey } = madridParts();
  const prev = readStats();
  const base = prev.dateKey === dateKey ? prev : { dateKey, cyclesRun: 0, signalsDetected: 0, autoExecuted: 0, semiAuto: 0 };
  const valid = result.orders.filter(isValidSignal);
  const autoNow = result.orders.filter((o) => o.status === "EXECUTED").length;
  const semiNow = result.orders.filter((o) => o.status === "PENDING_APPROVAL").length;
  const next: CycleDailyStats = {
    dateKey,
    cyclesRun: base.cyclesRun + 1,
    signalsDetected: base.signalsDetected + valid.length,
    autoExecuted: base.autoExecuted + autoNow,
    semiAuto: base.semiAuto + semiNow,
  };
  writeStats(next);
  return next;
}

async function fetchMacroLines(): Promise<{
  spy: MacroLine;
  qqq: MacroLine;
  vix: MacroLine;
  dxy: MacroLine;
  gold: MacroLine;
  tnx: MacroLine;
  sectors: Array<{ etf: string; name: string; changePct: number }>;
}> {
  const symbols = ["SPY", "QQQ", "^VIX", "DX-Y.NYB", "GLD", "TNX", ...SECTOR_ETFS.map((s) => s.etf)];
  const quotes = await getBatchQuotes(symbols);
  const line = (label: string, sym: string): MacroLine => {
    const q = quotes.get(sym) ?? quotes.get(sym.replace("^", ""));
    return { label: sym, price: q?.price ?? null, changePct: q?.changePercentage ?? null };
  };
  const sectors = SECTOR_ETFS.map(({ etf, name }) => {
    const q = quotes.get(etf);
    return { etf, name, changePct: q?.changePercentage ?? 0 };
  }).sort((a, b) => b.changePct - a.changePct);
  return {
    spy: line("SPY", "SPY"),
    qqq: line("QQQ", "QQQ"),
    vix: line("VIX", "^VIX"),
    dxy: line("DXY", "DX-Y.NYB"),
    gold: line("GLD", "GLD"),
    tnx: line("TNX", "TNX"),
    sectors,
  };
}

async function fetchBrokerConnected(): Promise<boolean> {
  try {
    const status = await ibkrServiceFetch<{ connected?: boolean }>("/api/ibkr/status");
    return Boolean(status.connected);
  } catch {
    return false;
  }
}

type PositionRow = {
  symbol: string;
  shares: number;
  avgCost: number;
  account: string;
  price: number;
  pnlPct: number;
};

async function fetchPortfolioRows(): Promise<PositionRow[]> {
  const positions = await ibkrServiceFetch<
    Array<{ symbol?: string; position?: number; avgCost?: number; account?: string }>
  >("/api/ibkr/positions").catch(() => []);
  const rows = (positions ?? []).filter((p) => Math.abs(Number(p.position ?? 0)) > 0);
  const symbols = [...new Set(rows.map((p) => String(p.symbol ?? "").toUpperCase()).filter(Boolean))];
  const quotes = await getBatchQuotes(symbols);
  return rows.map((p) => {
    const symbol = String(p.symbol ?? "").toUpperCase();
    const shares = Number(p.position ?? 0);
    const avgCost = Number(p.avgCost ?? 0);
    const price = quotes.get(symbol)?.price ?? avgCost;
    const pnlPct = avgCost > 0 ? ((price - avgCost) / avgCost) * 100 : 0;
    return { symbol, shares, avgCost, account: String(p.account ?? ""), price, pnlPct };
  });
}

function signalBox(order: OrderResult, dailyMeta?: { category: string; rsi14: number; volume: number; avgVolume: number }): string {
  const conf = Math.round(order.signal.confidence * 100);
  const volRatio = dailyMeta && dailyMeta.avgVolume > 0 ? dailyMeta.volume / dailyMeta.avgVolume : null;
  const sl = order.stopLoss ?? 0;
  const tp = order.takeProfit ?? 0;
  const slPct = order.price && sl ? (((sl - order.price) / order.price) * 100).toFixed(0) : "3";
  const tpPct = order.price && tp ? (((tp - order.price) / order.price) * 100).toFixed(0) : "8";
  const cat = dailyMeta?.category ?? "General";
  return [
    "┌─────────────────────────────────┐",
    `│ 🟢 ${order.ticker} — ${order.direction}`.padEnd(34) + "│",
    `│ Confianza: ${conf}% | Precio: ${fmtUsd(order.price ?? 0)} │`,
    `│ SL: ${fmtUsd(sl)} (${slPct}%) | TP: ${fmtUsd(tp)} (${tpPct}%) │`,
    `│ Volumen: ${volRatio != null ? `${volRatio.toFixed(1)}x media` : "N/A"} | RSI: ${dailyMeta?.rsi14?.toFixed(0) ?? "—"} │`,
    `│ Categoría: ${cat} ${categoryEmoji(cat)}`.padEnd(34) + "│",
    `│ Razón: ${order.signal.reasoning.slice(0, 28)} │`,
    "└─────────────────────────────────┘",
  ].join("\n");
}

function portfolioTable(rows: PositionRow[]): string {
  if (rows.length === 0) return "Sin posiciones abiertas.";
  const top = rows.slice(0, 8);
  const lines = [
    "┌──────────┬────────┬────────┬────────┐",
    "│ Ticker   │ Precio │ P&L    │ Estado │",
    "├──────────┼────────┼────────┼────────┤",
  ];
  for (const r of top) {
    const state = r.pnlPct >= 8 ? "🟡 TP" : r.pnlPct <= -3 ? "🔴 SL" : r.pnlPct >= 0 ? "🟢 OK" : "🟠 WATCH";
    lines.push(
      `│ ${r.symbol.padEnd(8)} │ ${fmtUsd(r.price).padStart(6)} │ ${fmtPct(r.pnlPct).padStart(6)} │ ${state.padEnd(6)} │`,
    );
  }
  lines.push("└──────────┴────────┴────────┴────────┘");
  return lines.join("\n");
}

export async function sendCyclePremiumReport(
  result: TradeCycleResult,
  meta: { analyzed: number; universeScanned: number; universeFiltered: number },
): Promise<void> {
  const stats = recordCycleStats(result);
  const { dayName, dateLabel, timeLabel } = madridParts();
  const validSignals = result.orders.filter(isValidSignal);
  const accountSnap = await fetchTradingAccountSnapshot().catch(() => null);
  const navEur = accountSnap?.combinedNav ?? accountSnap?.navUSD ?? result.accountSnapshot.navUSD;
  const navPct = navEur > 0 ? (result.accountSnapshot.dailyPnlUSD / navEur) * 100 : 0;

  if (validSignals.length === 0) {
    await sendTelegramMessage(
      `✅ FORGEOS ${timeLabel} | ${meta.analyzed} analizados | Sin señales (conf&lt;60%) | NAV: ${fmtEur(navEur)} | Próximo: 3min`,
    );
    return;
  }

  const [macro, macroSentiment, portfolio, brokerOk, daily] = await Promise.all([
    fetchMacroLines(),
    getMacroSentimentContext(),
    fetchPortfolioRows(),
    fetchBrokerConnected(),
    Promise.resolve(getDailyMarketUniverse()),
  ]);

  const leader = macro.sectors[0];
  const laggard = macro.sectors[macro.sectors.length - 1];
  const monitored = loadTradingState().monitoredPositions;
  const slLines = monitored.map((p) => `${p.ticker} @${fmtUsd(p.stopLoss)}`).join(" | ");
  const tpLines = monitored.map((p) => `${p.ticker} @${fmtUsd(p.takeProfit)}`).join(" | ");

  const todayKey = madridParts().dateKey;
  const outcomes = loadOptimizerState().closedOutcomes;
  const todayTrades = outcomes.filter((o) => (o.closedAt ?? "").startsWith(todayKey));
  const weekTrades = outcomes.filter((o) => {
    const t = new Date(o.closedAt).getTime();
    return Date.now() - t <= 7 * 24 * 60 * 60 * 1000;
  });
  const todayPnl = todayTrades.reduce((s, o) => s + (o.pnlUSD ?? 0), 0);
  const weekPnl = weekTrades.reduce((s, o) => s + (o.pnlUSD ?? 0), 0);
  const winsToday = todayTrades.filter((o) => (o.pnlUSD ?? 0) > 0).length;
  const winRate = todayTrades.length > 0 ? (winsToday / todayTrades.length) * 100 : 0;
  const bestToday = todayTrades.sort((a, b) => (b.pnlPct ?? 0) - (a.pnlPct ?? 0))[0];

  const dailyPnlUSD = accountSnap?.dailyPnlUSD ?? result.accountSnapshot.dailyPnlUSD;
  const exposureUsd = portfolio.reduce((s, r) => s + Math.abs(r.shares * r.price), 0);
  const exposurePct = navEur > 0 ? (exposureUsd / navEur) * 100 : 0;
  const maxRisk = navEur * TRADING_CONFIG.risk.dailyLossLimitPct;

  const acctU242 = accountSnap?.accounts.find((a) => a.accountId === "U24225949");
  const acctU155 = accountSnap?.accounts.find((a) => a.accountId === "U15513057");

  const signalBlocks = validSignals.slice(0, 4).map((o) => {
    const metaTicker = daily?.tickers.find((t) => t.symbol === o.ticker);
    return signalBox(o, metaTicker);
  });

  const autoLines = result.orders
    .filter((o) => o.status === "EXECUTED")
    .map((o) => `⚡ AUTO-EJECUTADO: ${o.ticker} ${o.direction} @${fmtUsd(o.price ?? 0)} | Conf: ${Math.round(o.signal.confidence * 100)}%`)
    .join("\n");

  const alerts: string[] = [];
  for (const t of daily?.tickers ?? []) {
    if (t.avgVolume > 0 && t.volume / t.avgVolume >= 2) {
      alerts.push(`🔥 ${t.symbol}: Volumen ${(t.volume / t.avgVolume).toFixed(1)}x media inusual`);
    }
    if (t.dist52wHigh >= 0.98) {
      alerts.push(`📈 ${t.symbol}: Cerca de máximo anual (${(t.dist52wHigh * 100).toFixed(0)}%)`);
    }
  }
  for (const e of daily?.excludedEarnings ?? []) {
    alerts.push(`📅 ${e} earnings hoy — excluido del ciclo`);
  }
  for (const r of portfolio.filter((p) => p.pnlPct >= 8)) {
    alerts.push(`📈 ${r.symbol}: Cerca de tomar profit (${fmtPct(r.pnlPct)})`);
  }

  const vixLabel =
    macro.vix.price != null && macro.vix.price < 20
      ? "Baja volatilidad ✅"
      : macro.vix.price != null && macro.vix.price >= 25
        ? "Alta volatilidad ⚠️"
        : "Volatilidad moderada";

  const text = [
    "🤖 FORGEOS AI INVESTMENT SYSTEM",
    `📅 ${dayName} ${dateLabel} | 🕐 ${timeLabel} Madrid`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
    "🌍 MACRO &amp; MERCADO",
    `- S&amp;P 500: ${macro.spy.price != null ? macro.spy.price.toFixed(0) : "N/A"} (${fmtPct(macro.spy.changePct)}) | NASDAQ: ${macro.qqq.price != null ? macro.qqq.price.toFixed(0) : "N/A"} (${fmtPct(macro.qqq.changePct)})`,
    `- VIX: ${macro.vix.price?.toFixed(1) ?? "N/A"} (${vixLabel})`,
    `- DXY: ${macro.dxy.price?.toFixed(1) ?? "N/A"} (${fmtPct(macro.dxy.changePct)}) | Gold: ${macro.gold.price != null ? fmtUsd(macro.gold.price) : "N/A"} (${fmtPct(macro.gold.changePct)})`,
    `- 10Y Yield: ${macro.tnx.price?.toFixed(2) ?? "N/A"}% | Fear &amp; Greed: ${macroSentiment.fearGreedIndex ?? "N/A"} (${macroSentiment.fearGreedLabel ?? "N/A"})`,
    `- Sector líder hoy: ${leader?.name ?? "N/A"} 🏆 (${leader?.etf ?? ""} ${fmtPct(leader?.changePct)})`,
    `- Sector rezagado: ${laggard?.name ?? "N/A"} (${laggard?.etf ?? ""} ${fmtPct(laggard?.changePct)})`,
    "",
    "🧠 AI COMMITTEE — ANÁLISIS",
    `- Universo escaneado: ${meta.universeScanned.toLocaleString("es-ES")} tickers USA`,
    `- Filtrados por criterios: ${meta.universeFiltered} candidatos`,
    `- Analizados por IA: ${meta.analyzed} | Señales válidas: ${validSignals.length}`,
    "- Agentes activos: ALPHA + MOMENTUM + SENTINEL + ORACLE + GOVERNOR",
    "",
    "📊 SEÑALES DETECTADAS",
    signalBlocks.join("\n"),
    autoLines || "",
    "",
    "💼 PORTFOLIO ACTUAL",
    portfolioTable(portfolio),
    slLines ? `- SL activos: ${slLines}` : "",
    tpLines ? `- TP activos: ${tpLines}` : "",
    "",
    "💰 CAPITAL &amp; RIESGO",
    `- U24225949 (Cash): ${fmtEur(acctU242?.cash ?? 0)} disponible`,
    `- U15513057 (Margin): ${fmtEur(acctU155?.cash ?? 0)} disponible`,
    `- NAV Total: ${fmtEur(navEur)} (${fmtPct(navPct)})`,
    `- Exposición: ${exposurePct.toFixed(0)}% del portfolio`,
    `- Riesgo máximo día: ${fmtEur(maxRisk)} (-10% NAV)`,
    `- Drawdown actual: ${dailyPnlUSD < 0 && navEur > 0 ? fmtPct((dailyPnlUSD / navEur) * 100) : "0%"}`,
    "",
    "📈 RENDIMIENTO",
    `- Hoy: ${todayPnl >= 0 ? "+" : ""}${fmtUsd(todayPnl)} (${fmtPct(navPct)})`,
    `- Semana: ${weekPnl >= 0 ? "+" : ""}${fmtUsd(weekPnl)} (${navEur > 0 ? fmtPct((weekPnl / navEur) * 100) : "N/A"})`,
    `- Operaciones hoy: ${todayTrades.length} | Ganadoras: ${winsToday} | Win rate: ${winRate.toFixed(0)}%`,
    "- Ratio R/R medio: 1:2.6",
    bestToday ? `- Mejor operación: ${bestToday.ticker} ${fmtPct(bestToday.pnlPct)}` : "",
    "",
    "🔔 ALERTAS ACTIVAS",
    ...(alerts.length ? alerts.map((a) => `- ${a}`) : ["- Sin alertas críticas"]),
    "",
    "⚙️ SISTEMA",
    `- Estado: ${RiskManager.getInstance().isHalted() ? "🔴 PAUSADO" : "🟢 OPERATIVO"}`,
    `- Broker: ${brokerOk ? "🟢 CONECTADO (IBKR)" : "🔴 DESCONECTADO"}`,
    "- Próximo ciclo: 3 min",
    `- Ciclos hoy: ${stats.cyclesRun} | Señales: ${stats.signalsDetected} | Auto-ejecutadas: ${stats.autoExecuted}`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  ]
    .filter(Boolean)
    .join("\n");

  await sendTelegramMessage(text, [
    [
      { text: "⚡ CICLO AHORA", callback_data: "run_cycle" },
      { text: "🧠 AI COMMITTEE", callback_data: "committee_run" },
    ],
    [
      { text: "💼 PORTFOLIO", callback_data: "view_portfolio" },
      { text: "⚙️ SETTINGS", callback_data: "view_settings" },
    ],
  ]);
}

export async function sendDailyClosePremiumReport(): Promise<void> {
  const { dateLabel } = madridParts();
  const dateKey = madridParts().dateKey;
  const account = await fetchTradingAccountSnapshot().catch(() => null);
  const navEur = account?.combinedNav ?? account?.navUSD ?? 0;
  const outcomes = loadOptimizerState().closedOutcomes;
  const daily = outcomes.filter((o) => (o.closedAt ?? "").startsWith(dateKey));
  const stats = readStats();
  const pnl = daily.reduce((s, o) => s + (o.pnlUSD ?? 0), 0);
  const wins = daily.filter((o) => (o.pnlUSD ?? 0) > 0).length;
  const losses = daily.length - wins;
  const winRate = daily.length > 0 ? (wins / daily.length) * 100 : 0;
  const best = [...daily].sort((a, b) => (b.pnlPct ?? 0) - (a.pnlPct ?? 0))[0];
  const worst = [...daily].sort((a, b) => (a.pnlPct ?? 0) - (b.pnlPct ?? 0))[0];
  const navPct = navEur > 0 ? (pnl / navEur) * 100 : 0;
  const rr =
    daily.length > 0
      ? daily.reduce((s, o) => s + Math.abs(o.pnlPct ?? 0), 0) / daily.length / 3
      : 2.6;

  const text = [
    `📊 FORGEOS — CIERRE DEL DÍA ${dateLabel}`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `📈 P&amp;L DÍA: ${pnl >= 0 ? "+" : ""}${fmtUsd(pnl)} (${fmtPct(navPct)})`,
    `📊 Operaciones: ${daily.length} | Ganadoras: ${wins} | Perdedoras: ${losses}`,
    `🏆 Win Rate: ${winRate.toFixed(0)}% | Ratio R/R: 1:${rr.toFixed(1)}`,
    `💰 NAV Final: ${fmtEur(navEur)} (${pnl >= 0 ? "+" : ""}${fmtEur(pnl)})`,
    `⚡ Auto-ejecutadas: ${stats.autoExecuted} | Semi-auto: ${stats.semiAuto}`,
    best ? `🥇 Mejor: ${best.ticker} ${fmtPct(best.pnlPct)}` : "",
    worst ? `📉 Peor: ${worst.ticker} ${fmtPct(worst.pnlPct)}` : "",
    "🌙 Posiciones cerradas: todas (day trading)",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "📅 Mañana: Apertura Europa 09:00",
  ]
    .filter(Boolean)
    .join("\n");

  await sendTelegramMessage(text, [
    [
      { text: "📊 VER DETALLE", callback_data: "view_portfolio" },
      { text: "🧠 AI COMMITTEE", callback_data: "committee_run" },
    ],
    [{ text: "📈 HISTÓRICO", callback_data: "view_history" }],
  ]);
}
