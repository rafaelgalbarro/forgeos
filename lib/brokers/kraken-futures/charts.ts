/**
 * Kraken Futures candles — Charts API (public, no auth).
 *   GET https://futures.kraken.com/api/charts/v1/{tick_type}/{symbol}/{resolution}?from&to&count
 * The previous implementation called /derivatives/api/v3/history/{symbol}/{minutes},
 * which is not a candle endpoint → empty backfill, so 1h strategies starved
 * ("insuficientes barras 1h") until ~60 h of WS ticks had accumulated.
 */

export type ChartsResolution = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "12h" | "1d" | "1w";

const MINUTES_TO_RES: Record<number, ChartsResolution> = {
  1: "1m",
  5: "5m",
  15: "15m",
  30: "30m",
  60: "1h",
  240: "4h",
  720: "12h",
  1440: "1d",
  10080: "1w",
};

export function chartsResolution(minutes: number): ChartsResolution | null {
  return MINUTES_TO_RES[minutes] ?? null;
}

export function krakenFuturesChartsBase(demo: boolean): string {
  return demo ? "https://demo-futures.kraken.com/api/charts/v1" : "https://futures.kraken.com/api/charts/v1";
}

export function chartsCandlesUrl(args: {
  demo: boolean;
  symbol: string;
  minutes: number;
  count?: number;
  fromSec?: number;
  tickType?: "trade" | "mark" | "spot";
}): string | null {
  const res = chartsResolution(args.minutes);
  if (!res) return null;
  const q = new URLSearchParams();
  if (args.fromSec) q.set("from", String(Math.floor(args.fromSec)));
  if (args.count) q.set("count", String(Math.floor(args.count)));
  const qs = q.toString();
  return (
    `${krakenFuturesChartsBase(args.demo)}/${args.tickType ?? "trade"}/` +
    `${args.symbol.toUpperCase()}/${res}${qs ? `?${qs}` : ""}`
  );
}

export type ChartsCandle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export function parseChartsCandles(body: unknown): ChartsCandle[] {
  const rows = (body as { candles?: unknown })?.candles;
  if (!Array.isArray(rows)) return [];
  const out: ChartsCandle[] = [];
  for (const r of rows) {
    const row = r as Record<string, unknown>;
    const t = Number(row.time);
    const ms = t > 1e12 ? t : t * 1000;
    const c = {
      time: new Date(ms).toISOString(),
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume ?? 0),
    };
    if (Number.isFinite(ms) && ms > 0 && c.close > 0) out.push(c);
  }
  return out.sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
}
