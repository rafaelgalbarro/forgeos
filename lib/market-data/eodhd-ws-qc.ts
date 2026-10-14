/**
 * EODHD WS quality control — compare WS mid vs latest 1m candle close (not IBKR).
 */

import "server-only";

import { cacheKey, getOrSetCached } from "@/lib/market-data/cache";
import {
  isEodhdConfigured,
  toEodhdSymbol,
} from "@/lib/market-data/eodhd";
import { EODHD_WS_STALE_ALERT_MS } from "@/lib/market-data/eodhd-ws-client";
import { getEodhdWsQuote } from "@/lib/market-data/eodhd-ws-store";
import { isUsEodhdWsSession } from "@/lib/trading/exchange-hours";

export const EODHD_WS_VS_1M_MAX_PCT = 1.0;
const QC_1M_CACHE_MS = 55_000;
const TELEGRAM_COOLDOWN_MS = 10 * 60_000;

export type EodhdWsQcCode = "OK" | "STALE" | "NO_WS" | "NO_1M" | "DIVERGENCE_1M";

export type EodhdWsQcResult = {
  symbol: string;
  ok: boolean;
  code: EodhdWsQcCode;
  reason: string;
  wsMid?: number;
  candle1mClose?: number;
  divergencePct?: number;
  checkedAt: string;
};

const blocked = new Map<string, EodhdWsQcResult>();
const lastTelegramAt = new Map<string, number>();

function midPrice(bid: number, ask: number, last: number): number {
  if (bid > 0 && ask >= bid) return (bid + ask) / 2;
  if (last > 0) return last;
  return bid > 0 ? bid : ask;
}

function divergencePct(a: number, b: number): number {
  const mid = (a + b) / 2;
  if (!(mid > 0)) return 0;
  return (Math.abs(a - b) / mid) * 100;
}

async function eodhdFetchLatest1mClose(ticker: string): Promise<number | null> {
  if (!isEodhdConfigured()) return null;
  const symbol = ticker.trim().toUpperCase();
  const eodhdSymbol = toEodhdSymbol(symbol);
  const id = cacheKey("eodhd-1m-qc", eodhdSymbol);
  return getOrSetCached(id, QC_1M_CACHE_MS, async () => {
    const key = process.env.EODHD_API_KEY?.trim() ?? "";
    const base = (process.env.EODHD_BASE_URL ?? "https://eodhd.com/api").replace(/\/$/, "");
    const to = Math.floor(Date.now() / 1000);
    const from = to - 2 * 24 * 60 * 60;
    const url =
      `${base}/intraday/${encodeURIComponent(eodhdSymbol)}?interval=1m&from=${from}&to=${to}` +
      `&api_token=${encodeURIComponent(key)}&fmt=json`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
      if (!res.ok) return null;
      const rows = (await res.json()) as Array<{ close?: number }>;
      for (let i = (rows?.length ?? 0) - 1; i >= 0; i -= 1) {
        const c = Number(rows[i]?.close ?? 0);
        if (c > 0) return c;
      }
      return null;
    } catch {
      return null;
    }
  });
}

async function telegramQcAlert(symbol: string, line: string): Promise<void> {
  const now = Date.now();
  const prev = lastTelegramAt.get(symbol) ?? 0;
  if (now - prev < TELEGRAM_COOLDOWN_MS) return;
  lastTelegramAt.set(symbol, now);
  try {
    const { sendSystemTelegramAlert } = await import("@/lib/notifications/telegram-policy");
    await sendSystemTelegramAlert(
      "eodhd_ws_qc",
      `⚠️ <b>EODHD WS QC</b> ${line}`,
    ).catch(() => undefined);
  } catch {
    /* optional */
  }
}

/** Evaluate WS vs 1m candle (+ stale). Updates per-symbol block map when alert=true. */
export async function evaluateEodhdWsQuality(
  ticker: string,
  opts: { alert?: boolean; at?: Date } = {},
): Promise<EodhdWsQcResult> {
  const symbol = ticker.trim().toUpperCase();
  const at = opts.at ?? new Date();
  const checkedAt = new Date().toISOString();

  if (!isUsEodhdWsSession(at)) {
    const r: EodhdWsQcResult = {
      symbol,
      ok: true,
      code: "OK",
      reason: "outside WS window",
      checkedAt,
    };
    blocked.delete(symbol);
    return r;
  }

  const ws = getEodhdWsQuote(symbol);
  if (!ws) {
    const r: EodhdWsQcResult = {
      symbol,
      ok: false,
      code: "NO_WS",
      reason: `${symbol}: sin cotización WS`,
      checkedAt,
    };
    blocked.set(symbol, r);
    if (opts.alert) {
      void telegramQcAlert(symbol, `${symbol}: sin datos WS`);
    }
    return r;
  }

  const age = Date.now() - ws.updatedAtMs;
  const wsMid = midPrice(ws.bid, ws.ask, ws.last);
  if (age > EODHD_WS_STALE_ALERT_MS) {
    const r: EodhdWsQcResult = {
      symbol,
      ok: false,
      code: "STALE",
      reason: `${symbol}: WS sin datos ${Math.round(age / 60_000)}m (>2m)`,
      wsMid: wsMid > 0 ? wsMid : undefined,
      checkedAt,
    };
    blocked.set(symbol, r);
    if (opts.alert) {
      console.warn(`[EODHD/WS/QC] ${r.reason}`);
      void telegramQcAlert(symbol, r.reason);
    }
    return r;
  }

  if (!(wsMid > 0)) {
    const r: EodhdWsQcResult = {
      symbol,
      ok: false,
      code: "NO_WS",
      reason: `${symbol}: WS sin bid/ask/last usable`,
      checkedAt,
    };
    blocked.set(symbol, r);
    return r;
  }

  const candle1mClose = await eodhdFetchLatest1mClose(symbol);
  if (candle1mClose == null || !(candle1mClose > 0)) {
    const r: EodhdWsQcResult = {
      symbol,
      ok: false,
      code: "NO_1M",
      reason: `${symbol}: sin vela 1m EODHD para QC`,
      wsMid,
      checkedAt,
    };
    blocked.set(symbol, r);
    return r;
  }

  const div = divergencePct(wsMid, candle1mClose);
  if (div > EODHD_WS_VS_1M_MAX_PCT) {
    const r: EodhdWsQcResult = {
      symbol,
      ok: false,
      code: "DIVERGENCE_1M",
      reason:
        `${symbol}: WS $${wsMid.toFixed(2)} vs 1m close $${candle1mClose.toFixed(2)} ` +
        `(Δ${div.toFixed(2)}% > ${EODHD_WS_VS_1M_MAX_PCT}%)`,
      wsMid,
      candle1mClose,
      divergencePct: div,
      checkedAt,
    };
    blocked.set(symbol, r);
    if (opts.alert) {
      console.warn(`[EODHD/WS/QC] ${r.reason}`);
      void telegramQcAlert(symbol, r.reason);
    }
    return r;
  }

  const r: EodhdWsQcResult = {
    symbol,
    ok: true,
    code: "OK",
    reason: "ok",
    wsMid,
    candle1mClose,
    divergencePct: div,
    checkedAt,
  };
  blocked.delete(symbol);
  return r;
}

export function isEodhdWsQcBlocked(ticker: string): EodhdWsQcResult | null {
  const symbol = ticker.trim().toUpperCase();
  const hit = blocked.get(symbol);
  return hit && !hit.ok ? hit : null;
}

/** Clear blocks at stocks cycle start (re-evaluated per ticker on entry). */
export function clearEodhdWsQcBlocks(): void {
  blocked.clear();
}

export async function runEodhdWsQcForSymbols(
  symbols: readonly string[],
): Promise<void> {
  if (!isUsEodhdWsSession()) return;
  for (const s of symbols) {
    await evaluateEodhdWsQuality(s, { alert: true });
    await new Promise((r) => setTimeout(r, 120));
  }
}

/** Test helper. */
export function __resetEodhdWsQcForTests(): void {
  blocked.clear();
  lastTelegramAt.clear();
}
