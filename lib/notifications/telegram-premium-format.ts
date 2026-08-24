/**
 * Premium Telegram message formatting — ASCII boxes + emojis (plain text, no HTML).
 */

import "server-only";

export type PremiumCloseLine = {
  ticker: string;
  pnlUSD: number;
  pnlPct: number;
  kind: "TP" | "SL" | "MANUAL" | "PAPER";
};

export type PremiumOpenLine = {
  ticker: string;
  shares: number;
  price: number;
  pnlPct: number;
  sl: number;
  tp: number;
};

export type PremiumAccountLine = {
  accountId: string;
  cashEur: number;
};

export type PremiumHourlyContext = {
  hourLabel: string;
  dailyPnlUsd: number;
  dailyPnlPct: number;
  ops: number;
  wins: number;
  losses: number;
  winRate: number;
  riskReward: string;
  best: PremiumCloseLine[];
  worst: PremiumCloseLine[];
  open: PremiumOpenLine[];
  accounts: PremiumAccountLine[];
  navEur: number;
  exposurePct: number;
  spyChangePct: number | null;
  nasdaqChangePct: number | null;
  vix: number | null;
  sectorLeader: string;
  ibkrOk: boolean;
  scannerOk: boolean;
  cyclesToday: number;
};

export type PremiumShortContext = {
  hourLabel: string;
  analyzed: number;
  navEur: number;
};

const RULE = "━━━━━━━━━━━━━━━━━━━━━━";

function fmtUsdSigned(n: number): string {
  const abs = Math.abs(n).toFixed(2);
  if (n >= 0) return `+$${abs}`;
  return `-$${abs}`;
}

function fmtPctSigned(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "N/A";
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

function fmtEur(n: number): string {
  return `€${Math.round(n).toLocaleString("es-ES")}`;
}

function padLine(inner: string, width = 25): string {
  const trimmed = inner.length > width ? `${inner.slice(0, width - 1)}…` : inner;
  return `│ ${trimmed.padEnd(width - 1)}│`;
}

function closeArrow(line: PremiumCloseLine): string {
  const arrow = line.pnlUSD >= 0 ? "▲" : "▼";
  const tag = line.kind === "TP" ? "TP" : line.kind === "SL" ? "SL" : line.kind;
  return `${arrow} ${line.ticker.padEnd(5)} ${fmtUsdSigned(line.pnlUSD).padStart(8)} (${fmtPctSigned(line.pnlPct)}) ${tag}`;
}

export function formatPremiumHourlySummary(ctx: PremiumHourlyContext): string {
  const perfBox = [
    "┌─────────────────────────┐",
    padLine(`P&L:  ${fmtUsdSigned(ctx.dailyPnlUsd).padStart(9)} (${fmtPctSigned(ctx.dailyPnlPct)})`),
    padLine(`Ops:  ${ctx.ops} | ✅ ${ctx.wins} | ❌ ${ctx.losses}`),
    padLine(`Rate: ${ctx.winRate.toFixed(0)}% | R/R: ${ctx.riskReward}`),
    "└─────────────────────────┘",
  ].join("\n");

  const bestLines =
    ctx.best.length > 0
      ? ctx.best.slice(0, 3).map(closeArrow).join("\n")
      : "— sin cierres ganadores —";
  const worstLines =
    ctx.worst.length > 0
      ? ctx.worst.slice(0, 3).map(closeArrow).join("\n")
      : "— sin cierres perdedores —";

  const openLines =
    ctx.open.length > 0
      ? ctx.open
          .slice(0, 6)
          .map(
            (p) =>
              `● ${p.ticker.padEnd(5)} ${Math.floor(p.shares)}acc @$${p.price.toFixed(2)} | ${fmtPctSigned(p.pnlPct)} | SL:$${p.sl.toFixed(2)} TP:$${p.tp.toFixed(2)}`,
          )
          .join("\n")
      : "Sin posiciones abiertas";

  const accountLines =
    ctx.accounts.length > 0
      ? ctx.accounts.map((a) => `${a.accountId}: ${fmtEur(a.cashEur)}`).join(" | ")
      : "N/A";

  const spy = ctx.spyChangePct != null ? fmtPctSigned(ctx.spyChangePct) : "N/A";
  const ndx = ctx.nasdaqChangePct != null ? fmtPctSigned(ctx.nasdaqChangePct) : "N/A";
  const vix = ctx.vix != null ? ctx.vix.toFixed(1) : "N/A";
  const ibkr = ctx.ibkrOk ? "🟢 IBKR" : "🔴 IBKR";
  const scanner = ctx.scannerOk ? "🟢 Scanner" : "🟡 Scanner";

  return [
    RULE,
    `🤖 FORGEOS AI | ${ctx.hourLabel} Madrid`,
    RULE,
    "",
    "📊 RENDIMIENTO HOY",
    perfBox,
    "",
    "🏆 MEJORES",
    bestLines,
    "",
    "💀 PEORES",
    worstLines,
    "",
    "💼 POSICIONES ABIERTAS",
    openLines,
    "",
    "💰 CAPITAL",
    accountLines,
    `NAV Total: ~${fmtEur(ctx.navEur)} | Exposición: ${ctx.exposurePct.toFixed(0)}%`,
    "",
    "📡 MERCADOS",
    `S&P: ${spy} | NASDAQ: ${ndx} | VIX: ${vix}`,
    ctx.sectorLeader,
    "",
    "⚙️ SISTEMA",
    `${ibkr} | ${scanner} | Ciclos: ${ctx.cyclesToday}`,
    RULE,
  ].join("\n");
}

export function formatShortHourlySummary(ctx: PremiumShortContext): string {
  return `🤖 FORGEOS | ${ctx.hourLabel} | ${ctx.analyzed} analizados | Sin señales | NAV: ${fmtEur(ctx.navEur)}`;
}

export function formatTpAlert(params: {
  ticker: string;
  price: number;
  pnlUSD: number;
  pnlPct: number;
  capitalFreed: number;
}): string {
  return [
    "🎯 TP ALCANZADO",
    `${params.ticker} vendido @$${params.price.toFixed(2)}`,
    `P&L: ${fmtUsdSigned(params.pnlUSD)} (${fmtPctSigned(params.pnlPct)})`,
    `Capital liberado: $${Math.round(params.capitalFreed).toLocaleString("en-US")}`,
  ].join("\n");
}

export function formatSlAlert(params: {
  ticker: string;
  price: number;
  pnlUSD: number;
  pnlPct: number;
  inherited?: boolean;
}): string {
  const lines = [
    "🛑 STOP LOSS",
    `${params.ticker} vendido @$${params.price.toFixed(2)}`,
    `P&L: ${fmtUsdSigned(params.pnlUSD)} (${fmtPctSigned(params.pnlPct)})`,
  ];
  if (params.inherited) lines.push("Posición heredada cerrada");
  return lines.join("\n");
}

export function formatBuyAlert(params: {
  ticker: string;
  shares: number;
  price: number;
  stopLoss: number;
  takeProfit: number;
}): string {
  const slPct = params.price > 0 ? ((params.stopLoss - params.price) / params.price) * 100 : -3;
  const tpPct = params.price > 0 ? ((params.takeProfit - params.price) / params.price) * 100 : 5;
  return [
    "⚡ COMPRA EJECUTADA",
    `${params.ticker} BUY ${Math.floor(params.shares)}acc @$${params.price.toFixed(2)}`,
    `SL: $${params.stopLoss.toFixed(2)} (${slPct.toFixed(0)}%)`,
    `TP: $${params.takeProfit.toFixed(2)} (${tpPct >= 0 ? "+" : ""}${tpPct.toFixed(0)}%)`,
  ].join("\n");
}

/** Risk/reward label from win/loss averages. */
export function computeRiskRewardLabel(wins: readonly number[], losses: readonly number[]): string {
  if (wins.length === 0 || losses.length === 0) return "—";
  const avgWin = wins.reduce((s, v) => s + v, 0) / wins.length;
  const avgLoss = Math.abs(losses.reduce((s, v) => s + v, 0) / losses.length);
  if (!(avgLoss > 0)) return "—";
  return `1:${(avgWin / avgLoss).toFixed(1)}`;
}

/** Rough USD→EUR for display (configurable). */
export function usdToEur(usd: number): number {
  const rate = Number(process.env.USD_EUR_RATE ?? "0.92");
  return usd * (Number.isFinite(rate) && rate > 0 ? rate : 0.92);
}
