/**
 * Telegram notification policy — hourly digests, immediate trade alerts, night silence.
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import { fetchTradingAccountSnapshot } from "@/lib/trading/ibkr-data";
import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";

const MADRID_TZ = "Europe/Madrid";
const STORE_FILE = path.resolve(process.cwd(), ".forgeos", "cache", "telegram-hourly.json");

export type TelegramAlertKind = "critical" | "trade" | "digest" | "noise";

type HourlyClose = {
  ticker: string;
  pnlUSD: number;
  kind: "TP" | "SL" | "MANUAL" | "PAPER";
  at: string;
};

type HourlyExec = {
  ticker: string;
  side: "BUY" | "SELL";
  shares: number;
  price: number;
  at: string;
};

type HourBucket = {
  hourKey: string;
  executions: HourlyExec[];
  closes: HourlyClose[];
};

type HourlyStore = {
  active: HourBucket;
  /** Completed hour waiting to be sent (max one). */
  pending: HourBucket | null;
  lastSentHourKey: string;
};

function madridHourKey(now = new Date()): { hourKey: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MADRID_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const pick = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hh = Number(pick("hour"));
  return {
    hourKey: `${pick("year")}-${pick("month")}-${pick("day")}-${String(hh).padStart(2, "0")}`,
    hour: hh,
  };
}

/** Night silence 23:00–08:00 Madrid — only critical alerts. */
export function isNightSilenceMadrid(now = new Date()): boolean {
  const { hour } = madridHourKey(now);
  return hour >= 23 || hour < 8;
}

export function canSendTelegramAlert(kind: TelegramAlertKind): boolean {
  if (kind === "critical") return true;
  if (isNightSilenceMadrid()) return false;
  return true;
}

function emptyBucket(hourKey: string): HourBucket {
  return { hourKey, executions: [], closes: [] };
}

function defaultStore(): HourlyStore {
  return {
    active: emptyBucket(madridHourKey().hourKey),
    pending: null,
    lastSentHourKey: "",
  };
}

function readStore(): HourlyStore {
  try {
    if (!fs.existsSync(STORE_FILE)) return defaultStore();
    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf8")) as Partial<HourlyStore>;
    const active =
      parsed.active && typeof parsed.active.hourKey === "string"
        ? {
            hourKey: parsed.active.hourKey,
            executions: Array.isArray(parsed.active.executions) ? parsed.active.executions : [],
            closes: Array.isArray(parsed.active.closes) ? parsed.active.closes : [],
          }
        : emptyBucket(madridHourKey().hourKey);
    const pending =
      parsed.pending && typeof parsed.pending.hourKey === "string"
        ? {
            hourKey: parsed.pending.hourKey,
            executions: Array.isArray(parsed.pending.executions) ? parsed.pending.executions : [],
            closes: Array.isArray(parsed.pending.closes) ? parsed.pending.closes : [],
          }
        : null;
    return {
      active,
      pending,
      lastSentHourKey: typeof parsed.lastSentHourKey === "string" ? parsed.lastSentHourKey : "",
    };
  } catch {
    return defaultStore();
  }
}

function writeStore(store: HourlyStore): void {
  fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

function hasActivity(b: HourBucket): boolean {
  return b.executions.length > 0 || b.closes.length > 0;
}

/** Rotate active → pending when Madrid hour changes. */
function rotateIfNeeded(store: HourlyStore): HourlyStore {
  const { hourKey } = madridHourKey();
  if (store.active.hourKey === hourKey) return store;
  const next: HourlyStore = {
    active: emptyBucket(hourKey),
    pending: hasActivity(store.active) ? store.active : store.pending,
    lastSentHourKey: store.lastSentHourKey,
  };
  // If we already had a pending and new completed hour also has activity, prefer the newer completed
  if (hasActivity(store.active) && store.pending && hasActivity(store.pending)) {
    next.pending = store.active;
  }
  return next;
}

export function recordHourlyExecution(params: {
  ticker: string;
  side: "BUY" | "SELL";
  shares: number;
  price: number;
}): void {
  let store = rotateIfNeeded(readStore());
  store.active.executions.push({
    ticker: params.ticker.toUpperCase(),
    side: params.side,
    shares: params.shares,
    price: params.price,
    at: new Date().toISOString(),
  });
  store.active.executions = store.active.executions.slice(-80);
  writeStore(store);
}

export function recordHourlyClose(params: {
  ticker: string;
  pnlUSD: number;
  kind: "TP" | "SL" | "MANUAL" | "PAPER";
}): void {
  let store = rotateIfNeeded(readStore());
  store.active.closes.push({
    ticker: params.ticker.toUpperCase(),
    pnlUSD: params.pnlUSD,
    kind: params.kind,
    at: new Date().toISOString(),
  });
  store.active.closes = store.active.closes.slice(-80);
  writeStore(store);
}

function fmtUsdSigned(n: number): string {
  if (n >= 0) return `+$${n.toFixed(2)}`;
  return `-$${Math.abs(n).toFixed(2)}`;
}

function fmtEur(n: number): string {
  return `€${n.toLocaleString("es-ES", { maximumFractionDigits: 0 })}`;
}

async function openPositionSymbols(): Promise<string[]> {
  try {
    const rows = await ibkrServiceFetch<Array<{ symbol?: string; position?: number }>>(
      "/api/ibkr/positions",
    );
    return (rows ?? [])
      .filter((p) => Math.abs(Number(p.position ?? 0)) > 0)
      .map((p) => String(p.symbol ?? "").toUpperCase())
      .filter(Boolean)
      .slice(0, 12);
  } catch {
    return [];
  }
}

function hourLabels(hourKey: string): { from: string; to: string } {
  const hh = Number(hourKey.slice(-2));
  return {
    from: `${String(hh).padStart(2, "0")}:00`,
    to: `${String((hh + 1) % 24).padStart(2, "0")}:00`,
  };
}

async function sendBucketSummary(bucket: HourBucket): Promise<void> {
  const closes = bucket.closes;
  const wins = closes.filter((c) => c.pnlUSD > 0);
  const losses = closes.filter((c) => c.pnlUSD <= 0);
  const hourPnl = closes.reduce((s, c) => s + c.pnlUSD, 0);
  const winRate = closes.length > 0 ? (wins.length / closes.length) * 100 : 0;
  const best = [...closes].sort((a, b) => b.pnlUSD - a.pnlUSD).slice(0, 2);
  const worst = [...closes].sort((a, b) => a.pnlUSD - b.pnlUSD).slice(0, 2);
  const ops = bucket.executions.length + closes.length;
  const { from, to } = hourLabels(bucket.hourKey);

  const [acct, openSyms] = await Promise.all([
    fetchTradingAccountSnapshot().catch(() => null),
    openPositionSymbols(),
  ]);
  const cash = acct?.cashUSD ?? acct?.tradingCashUSD ?? 0;

  const text = [
    `📊 FORGEOS — RESUMEN ${from}-${to}`,
    `⚡ Operaciones: ${ops} | Ganadoras: ${wins.length} | Perdedoras: ${losses.length}`,
    `💰 P&L hora: ${fmtUsdSigned(hourPnl)} | Win rate: ${winRate.toFixed(0)}%`,
    best.length
      ? `📈 Mejores: ${best.map((b) => `${b.ticker} ${fmtUsdSigned(b.pnlUSD)}`).join(" | ")}`
      : "📈 Mejores: —",
    worst.length
      ? `📉 Peores: ${worst.map((w) => `${w.ticker} ${fmtUsdSigned(w.pnlUSD)}`).join(" | ")}`
      : "📉 Peores: —",
    openSyms.length
      ? `💼 Posiciones abiertas: ${openSyms.length} (${openSyms.join(", ")})`
      : "💼 Posiciones abiertas: 0",
    `💵 Capital: ${fmtEur(cash)} disponible`,
  ].join("\n");

  await sendTelegramMessage(text);
}

/**
 * Flush pending hourly summary if any. Call every cycle / monitor tick.
 */
export async function maybeSendHourlyTelegramSummary(): Promise<boolean> {
  let store = rotateIfNeeded(readStore());
  writeStore(store);

  if (!store.pending) return false;
  if (store.lastSentHourKey === store.pending.hourKey) {
    store.pending = null;
    writeStore(store);
    return false;
  }
  if (!hasActivity(store.pending)) {
    store.lastSentHourKey = store.pending.hourKey;
    store.pending = null;
    writeStore(store);
    return false;
  }
  if (!canSendTelegramAlert("digest")) {
    console.log("[Telegram] resumen horario aplazado (noche 23:00-08:00)");
    return false;
  }

  const pending = store.pending;
  await sendBucketSummary(pending);
  store = readStore();
  store = rotateIfNeeded(store);
  store.lastSentHourKey = pending.hourKey;
  store.pending = null;
  writeStore(store);
  return true;
}

/** Cycle hook: rotate + try flush. No per-cycle spam. */
export async function onTradingCycleTelegramHook(): Promise<void> {
  await maybeSendHourlyTelegramSummary();
}

export async function sendImmediateTradeAlert(text: string): Promise<void> {
  if (!canSendTelegramAlert("trade")) {
    console.log("[Telegram] trade alert silenciada (noche 23:00-08:00)");
    return;
  }
  await sendTelegramMessage(text);
}

export async function sendCriticalTelegramAlert(text: string): Promise<void> {
  await sendTelegramMessage(text);
}
