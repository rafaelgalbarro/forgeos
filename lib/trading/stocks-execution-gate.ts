/**
 * Stocks execution brakes — re-read every cycle / every order (no stale cache).
 * - STOCKS_EXECUTION_ENABLED (default true) from .env.local each call — master override
 * - STOCKS_EXECUTION_US / STOCKS_EXECUTION_EU (default true) — market switches
 * - STOCKS_EXECUTION_PREMARKET (default false) — US premarket live orders (shadow when off)
 * - Global pause after >3 NO_ACK/rejects in 30 min → 2h halt + Telegram
 */

import fs from "node:fs";
import path from "node:path";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import { isEuropeanEurEquity } from "@/lib/trading/europe-equities";

const ENV_LOCAL = path.join(process.cwd(), ".env.local");
const PAUSE_FILE = path.join(
  process.cwd(),
  ".forgeos",
  "cache",
  "ibkr-stocks-execution-pause.json",
);
const EVENTS_FILE = path.join(
  process.cwd(),
  ".forgeos",
  "cache",
  "ibkr-stocks-reject-events.json",
);

const BROKER_SYMBOL_DAY_FILE = path.join(
  process.cwd(),
  ".forgeos",
  "cache",
  "ibkr-broker-no-ack-symbol-day.json",
);

const WINDOW_MS = 30 * 60_000;
const PAUSE_MS = 2 * 60 * 60_000;
const MAX_EVENTS = 3;

type RejectEvent = { at: number; symbol: string; kind: string };
type PauseState = {
  pausedUntil: string;
  reason: string;
  triggeredAt: string;
  telegramSent?: boolean;
};

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw == null || raw.trim() === "") return fallback;
  const v = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return fallback;
}

/** Read a single key from .env.local (fresh each call — no Nest/Next restart). */
export function readEnvLocalKey(key: string): string | undefined {
  try {
    if (!fs.existsSync(ENV_LOCAL)) return undefined;
    const text = fs.readFileSync(ENV_LOCAL, "utf8");
    const re = new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`, "m");
    const m = text.match(re);
    if (!m) return undefined;
    let v = (m[1] ?? "").trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    // strip inline comments
    const hash = v.indexOf(" #");
    if (hash >= 0) v = v.slice(0, hash).trim();
    return v;
  } catch {
    return undefined;
  }
}

/**
 * STOCKS_EXECUTION_ENABLED — default true (master override for US + EU).
 * Disk (.env.local) wins over process.env so toggles apply without restart.
 */
export function isStocksExecutionEnabled(): boolean {
  const fromDisk = readEnvLocalKey("STOCKS_EXECUTION_ENABLED");
  if (fromDisk != null) return parseBool(fromDisk, true);
  return parseBool(process.env.STOCKS_EXECUTION_ENABLED, true);
}

function readMarketSwitch(key: "STOCKS_EXECUTION_US" | "STOCKS_EXECUTION_EU"): boolean {
  const fromDisk = readEnvLocalKey(key);
  if (fromDisk != null) return parseBool(fromDisk, true);
  return parseBool(process.env[key], true);
}

/** US/ADR stocks execution switch — re-read from .env.local each call. */
export function isStocksExecutionUsEnabled(): boolean {
  if (!isStocksExecutionEnabled()) return false;
  return readMarketSwitch("STOCKS_EXECUTION_US");
}

/** European local equities execution switch — re-read from .env.local each call. */
export function isStocksExecutionEuEnabled(): boolean {
  if (!isStocksExecutionEnabled()) return false;
  return readMarketSwitch("STOCKS_EXECUTION_EU");
}

/** Market-aware enable: EU locals → EU switch; everything else stocks → US switch. */
export function isStocksExecutionEnabledForSymbol(symbol: string): boolean {
  if (!isStocksExecutionEnabled()) return false;
  if (isEuropeanEurEquity(symbol)) return isStocksExecutionEuEnabled();
  return isStocksExecutionUsEnabled();
}

/**
 * US premarket live orders — default false.
 * When false: PRE_MARKET still analyzes + journals shadow with live premarket price (no orders).
 * Disk (.env.local) wins over process.env.
 */
export function isStocksExecutionPremarketEnabled(): boolean {
  if (!isStocksExecutionEnabled() || !isStocksExecutionUsEnabled()) return false;
  const fromDisk = readEnvLocalKey("STOCKS_EXECUTION_PREMARKET");
  if (fromDisk != null) return parseBool(fromDisk, false);
  return parseBool(process.env.STOCKS_EXECUTION_PREMARKET, false);
}

function loadEvents(): RejectEvent[] {
  try {
    if (!fs.existsSync(EVENTS_FILE)) return [];
    const raw = JSON.parse(fs.readFileSync(EVENTS_FILE, "utf8")) as {
      events?: RejectEvent[];
    };
    return Array.isArray(raw.events) ? raw.events : [];
  } catch {
    return [];
  }
}

function saveEvents(events: RejectEvent[]): void {
  try {
    fs.mkdirSync(path.dirname(EVENTS_FILE), { recursive: true });
    fs.writeFileSync(
      EVENTS_FILE,
      JSON.stringify({ updatedAt: new Date().toISOString(), events }, null, 2),
      "utf8",
    );
  } catch (err) {
    console.warn(
      "[StocksGate] events save failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

function loadPause(): PauseState | null {
  try {
    if (!fs.existsSync(PAUSE_FILE)) return null;
    return JSON.parse(fs.readFileSync(PAUSE_FILE, "utf8")) as PauseState;
  } catch {
    return null;
  }
}

function savePause(state: PauseState): void {
  try {
    fs.mkdirSync(path.dirname(PAUSE_FILE), { recursive: true });
    fs.writeFileSync(PAUSE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (err) {
    console.warn(
      "[StocksGate] pause save failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

/** Active global pause end time, or null. */
export function stocksExecutionPausedUntil(): Date | null {
  const p = loadPause();
  if (!p?.pausedUntil) return null;
  const until = Date.parse(p.pausedUntil);
  if (!Number.isFinite(until) || Date.now() >= until) return null;
  return new Date(until);
}

export function getStocksExecutionPauseReason(): string | null {
  const until = stocksExecutionPausedUntil();
  if (!until) return null;
  const p = loadPause();
  return p?.reason ?? `pausa hasta ${until.toISOString()}`;
}

/**
 * Record a NO_ACK or hard reject. If >3 in 30 min → 2h pause + Telegram.
 */
export async function recordStocksRejectOrNoAck(params: {
  symbol: string;
  kind: "NO_ACK" | "REJECT" | string;
}): Promise<{ paused: boolean; countInWindow: number }> {
  const now = Date.now();
  const symbol = params.symbol.trim().toUpperCase();
  const events = loadEvents().filter((e) => now - e.at < WINDOW_MS);
  events.push({ at: now, symbol, kind: params.kind });
  saveEvents(events);

  if (events.length > MAX_EVENTS) {
    const existing = stocksExecutionPausedUntil();
    if (existing) {
      return { paused: true, countInWindow: events.length };
    }
    const pausedUntil = new Date(now + PAUSE_MS).toISOString();
    const reason =
      `>3 NO_ACK/rechazos en 30 min (${events.length} eventos: ` +
      `${events
        .slice(-5)
        .map((e) => `${e.symbol}:${e.kind}`)
        .join(", ")}) → pausa 2h`;
    savePause({
      pausedUntil,
      reason,
      triggeredAt: new Date(now).toISOString(),
      telegramSent: false,
    });
    await sendTelegramMessage(
      `🛑 <b>FRENO STOCKS</b>: ${reason}\nSin órdenes hasta ${pausedUntil}`,
    ).catch(() => undefined);
    const p = loadPause();
    if (p) {
      p.telegramSent = true;
      savePause(p);
    }
    console.error(`[StocksGate] ${reason}`);
    return { paused: true, countInWindow: events.length };
  }
  return { paused: false, countInWindow: events.length };
}

/**
 * Throws if stocks BUYs must not be sent (flag off or global pause).
 * SELLs / exits: only blocked by global pause (not by STOCKS_EXECUTION_* flags).
 * Pass `symbol` so STOCKS_EXECUTION_US / STOCKS_EXECUTION_EU apply correctly.
 * Pass `premarket: true` for US premarket live BUYs (STOCKS_EXECUTION_PREMARKET).
 */
export function assertStocksExecutionAllowed(opts?: {
  side?: "BUY" | "SELL";
  symbol?: string;
  /** When true, also require STOCKS_EXECUTION_PREMARKET (US extended-hours entries). */
  premarket?: boolean;
}): void {
  const side = opts?.side ?? "BUY";
  const pausedUntil = stocksExecutionPausedUntil();
  if (pausedUntil) {
    const reason = getStocksExecutionPauseReason() ?? "pausa global";
    throw new Error(
      `STOCKS_EXECUTION_PAUSED hasta ${pausedUntil.toISOString()}: ${reason}`,
    );
  }
  if (side !== "BUY") return;

  if (!isStocksExecutionEnabled()) {
    throw new Error(
      "STOCKS_EXECUTION_ENABLED=false — ciclo analiza pero no envía órdenes",
    );
  }

  const symbol = opts?.symbol?.trim().toUpperCase();
  if (!symbol) return;

  if (isEuropeanEurEquity(symbol) && !isStocksExecutionEuEnabled()) {
    throw new Error(
      "STOCKS_EXECUTION_EU=false — ciclo analiza EU pero no envía órdenes",
    );
  }
  if (!isEuropeanEurEquity(symbol) && !isStocksExecutionUsEnabled()) {
    throw new Error(
      "STOCKS_EXECUTION_US=false — ciclo analiza US pero no envía órdenes",
    );
  }
  if (opts?.premarket && !isEuropeanEurEquity(symbol) && !isStocksExecutionPremarketEnabled()) {
    throw new Error(
      "STOCKS_EXECUTION_PREMARKET=false — premarket analiza en shadow, sin órdenes",
    );
  }
}

/** Test helper — wipe pause + events. */
export function __resetStocksExecutionGateForTests(): void {
  try {
    if (fs.existsSync(PAUSE_FILE)) fs.unlinkSync(PAUSE_FILE);
    if (fs.existsSync(EVENTS_FILE)) fs.unlinkSync(EVENTS_FILE);
  } catch {
    /* ignore */
  }
}


/**
 * Symbols the IBKR broker blocked today (UTC) after a NO_ACK/reject
 * (services/ibkr-broker/app/order_send_brakes.py). The cycle must not keep
 * proposing them — the broker would only answer BROKER_NO_ACK_BRAKE again.
 */
export function brokerBrakedSymbolsToday(
  filePath: string = BROKER_SYMBOL_DAY_FILE,
  now: Date = new Date(),
): Set<string> {
  const out = new Set<string>();
  try {
    if (!fs.existsSync(filePath)) return out;
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
    const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const blocks = (
      obj.symbols && typeof obj.symbols === "object" ? obj.symbols : obj
    ) as Record<string, unknown>;
    const today = now.toISOString().slice(0, 10);
    for (const [sym, day] of Object.entries(blocks)) {
      if (String(day) === today) out.add(sym.trim().toUpperCase());
    }
  } catch {
    /* unreadable → no blocks */
  }
  return out;
}

export function isSymbolBrokerBrakedToday(symbol: string): boolean {
  return brokerBrakedSymbolsToday().has(symbol.trim().toUpperCase());
}
