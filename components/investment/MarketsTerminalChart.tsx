"use client";

import type { IndicatorId, OhlcBar } from "./markets-terminal.types";
import {
  fibonacciLevels,
  lastFinite,
  liquidityZones,
  pivotPoints,
  seriesAdx,
  seriesAtr,
  seriesBollinger,
  seriesDonchian,
  seriesEma,
  seriesIchimoku,
  seriesMacd,
  seriesRsi,
  seriesSma,
  seriesSupertrend,
  seriesVwap,
} from "./markets-terminal-indicators";
import styles from "@/styles/investment/markets-terminal.module.css";

type Props = {
  readonly bars: readonly OhlcBar[];
  readonly active: ReadonlySet<IndicatorId>;
  readonly symbol: string;
};

/**
 * SVG candlestick + volume from real OHLC only.
 * Empty bars → NO_DATA (never fabricates candles).
 */
export function MarketsTerminalChart({ bars, active, symbol }: Props) {
  if (bars.length < 2) {
    return (
      <div className={styles.chartEmpty} role="img" aria-label={`${symbol} chart unavailable`}>
        <span className={styles.badgeWarn}>NO_DATA</span>
        <p>No OHLC series from Market Intelligence for {symbol}. Candles are not fabricated.</p>
      </div>
    );
  }

  const w = 720;
  const hPrice = 220;
  const hVol = 56;
  const hOsc = 64;
  const padL = 8;
  const padR = 48;
  const padT = 10;
  const padB = 8;
  const n = bars.length;
  const candleW = Math.max(2, ((w - padL - padR) / n) * 0.7);
  const gap = (w - padL - padR) / n;

  let min = Infinity;
  let max = -Infinity;
  for (const b of bars) {
    min = Math.min(min, b.low);
    max = Math.max(max, b.high);
  }

  const overlays: { color: string; values: (number | null)[] }[] = [];
  if (active.has("sma")) overlays.push({ color: "#7eb6ff", values: seriesSma(bars, 20) });
  if (active.has("ema")) overlays.push({ color: "#f8b84e", values: seriesEma(bars, 20) });
  if (active.has("vwap")) overlays.push({ color: "#c084fc", values: seriesVwap(bars) });
  if (active.has("supertrend")) overlays.push({ color: "#59c48e", values: seriesSupertrend(bars) });
  if (active.has("bollinger")) {
    const bb = seriesBollinger(bars);
    overlays.push({ color: "#9fb4c9", values: bb.upper });
    overlays.push({ color: "#7eb6ff", values: bb.mid });
    overlays.push({ color: "#9fb4c9", values: bb.lower });
  }
  if (active.has("donchian")) {
    const d = seriesDonchian(bars);
    overlays.push({ color: "#e25b6a", values: d.upper });
    overlays.push({ color: "#59c48e", values: d.lower });
  }
  if (active.has("ichimoku")) {
    const ich = seriesIchimoku(bars);
    overlays.push({ color: "#f0c38a", values: ich.tenkan });
    overlays.push({ color: "#7eb6ff", values: ich.kijun });
  }

  for (const o of overlays) {
    for (const v of o.values) {
      if (typeof v === "number" && Number.isFinite(v)) {
        min = Math.min(min, v);
        max = Math.max(max, v);
      }
    }
  }

  const levels: { label: string; value: number; color: string }[] = [];
  if (active.has("fibonacci")) {
    const fib = fibonacciLevels(bars);
    if (fib) {
      for (const [k, v] of Object.entries(fib)) {
        levels.push({ label: `Fib ${k}`, value: v, color: "rgba(248,184,78,0.45)" });
        min = Math.min(min, v);
        max = Math.max(max, v);
      }
    }
  }
  if (active.has("pivot")) {
    const piv = pivotPoints(bars);
    if (piv) {
      for (const [k, v] of Object.entries(piv)) {
        levels.push({ label: k, value: v, color: "rgba(126,182,255,0.4)" });
        min = Math.min(min, v);
        max = Math.max(max, v);
      }
    }
  }
  if (active.has("liquidity")) {
    const z = liquidityZones(bars);
    if (z.resistance != null) {
      levels.push({ label: "R", value: z.resistance, color: "rgba(226,91,106,0.5)" });
      max = Math.max(max, z.resistance);
    }
    if (z.support != null) {
      levels.push({ label: "S", value: z.support, color: "rgba(89,196,142,0.5)" });
      min = Math.min(min, z.support);
    }
  }

  const span = max - min || 1;
  const yPrice = (v: number) => padT + ((max - v) / span) * (hPrice - padT - padB);
  const xAt = (i: number) => padL + i * gap + gap / 2;

  const pathFor = (values: readonly (number | null)[]) => {
    let d = "";
    let started = false;
    for (let i = 0; i < values.length; i += 1) {
      const v = values[i];
      if (v == null || !Number.isFinite(v)) {
        started = false;
        continue;
      }
      const x = xAt(i);
      const y = yPrice(v);
      d += `${started ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)} `;
      started = true;
    }
    return d.trim();
  };

  const volumes = bars.map((b) => (typeof b.volume === "number" ? b.volume : 0));
  const maxVol = Math.max(...volumes, 1);
  const hasVolume = volumes.some((v) => v > 0);

  const showRsi = active.has("rsi");
  const showMacd = active.has("macd");
  const showAdx = active.has("adx");
  const showOsc = showRsi || showMacd || showAdx;
  const rsi = showRsi ? seriesRsi(bars) : [];
  const macd = showMacd ? seriesMacd(bars) : null;
  const adx = showAdx ? seriesAdx(bars) : [];
  const atrLast = active.has("atr") ? lastFinite(seriesAtr(bars)) : null;

  const totalH = hPrice + (hasVolume ? hVol : 0) + (showOsc ? hOsc : 0) + 8;

  return (
    <div className={styles.chartWrap}>
      <svg
        viewBox={`0 0 ${w} ${totalH}`}
        width="100%"
        height={Math.min(totalH, 360)}
        role="img"
        aria-label={`${symbol} candlestick chart`}
      >
        <rect x="0" y="0" width={w} height={totalH} fill="rgba(8,12,18,0.55)" />
        {levels.map((lv) => {
          const y = yPrice(lv.value);
          return (
            <g key={`${lv.label}-${lv.value}`}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke={lv.color} strokeWidth={1} strokeDasharray="4 3" />
            </g>
          );
        })}
        {bars.map((b, i) => {
          const x = xAt(i);
          const bull = b.close >= b.open;
          const color = bull ? "#59c48e" : "#e25b6a";
          const yO = yPrice(b.open);
          const yC = yPrice(b.close);
          const yH = yPrice(b.high);
          const yL = yPrice(b.low);
          const top = Math.min(yO, yC);
          const bodyH = Math.max(1, Math.abs(yC - yO));
          return (
            <g key={`${b.timestamp}-${i}`}>
              <line x1={x} y1={yH} x2={x} y2={yL} stroke={color} strokeWidth={1} />
              <rect x={x - candleW / 2} y={top} width={candleW} height={bodyH} fill={color} />
            </g>
          );
        })}
        {overlays.map((o, idx) => (
          <path key={idx} d={pathFor(o.values)} fill="none" stroke={o.color} strokeWidth={1.4} />
        ))}
        <text x={w - padR + 4} y={yPrice(max) + 4} className={styles.chartAxis} fill="#9fb4c9" fontSize={9}>
          {max.toFixed(2)}
        </text>
        <text x={w - padR + 4} y={yPrice(min)} className={styles.chartAxis} fill="#9fb4c9" fontSize={9}>
          {min.toFixed(2)}
        </text>

        {hasVolume
          ? bars.map((b, i) => {
              const vol = typeof b.volume === "number" ? b.volume : 0;
              const vh = (vol / maxVol) * (hVol - 10);
              const x = xAt(i);
              const y = hPrice + hVol - vh;
              const bull = b.close >= b.open;
              return (
                <rect
                  key={`v-${i}`}
                  x={x - candleW / 2}
                  y={y}
                  width={candleW}
                  height={Math.max(1, vh)}
                  fill={bull ? "rgba(89,196,142,0.45)" : "rgba(226,91,106,0.45)"}
                />
              );
            })
          : null}

        {showOsc ? (
          <g transform={`translate(0, ${hPrice + (hasVolume ? hVol : 0)})`}>
            <line x1={padL} y1={0} x2={w - padR} y2={0} stroke="rgba(47,64,84,0.9)" />
            {showRsi
              ? (() => {
                  const vals = rsi.filter((v): v is number => v != null);
                  const rMin = 0;
                  const rMax = 100;
                  const yR = (v: number) => 6 + ((rMax - v) / (rMax - rMin)) * (hOsc - 12);
                  let d = "";
                  let started = false;
                  for (let i = 0; i < rsi.length; i += 1) {
                    const v = rsi[i];
                    if (v == null) {
                      started = false;
                      continue;
                    }
                    d += `${started ? "L" : "M"}${xAt(i).toFixed(1)},${yR(v).toFixed(1)} `;
                    started = true;
                  }
                  return (
                    <>
                      <line x1={padL} y1={yR(70)} x2={w - padR} y2={yR(70)} stroke="rgba(226,91,106,0.35)" strokeDasharray="3 2" />
                      <line x1={padL} y1={yR(30)} x2={w - padR} y2={yR(30)} stroke="rgba(89,196,142,0.35)" strokeDasharray="3 2" />
                      <path d={d.trim()} fill="none" stroke="#c084fc" strokeWidth={1.2} />
                      {vals.length ? (
                        <text x={padL} y={12} fill="#c084fc" fontSize={9}>
                          RSI {vals[vals.length - 1]!.toFixed(1)}
                        </text>
                      ) : null}
                    </>
                  );
                })()
              : null}
            {showMacd && macd
              ? (() => {
                  const histVals = macd.hist.filter((v): v is number => v != null);
                  const peak = Math.max(...histVals.map(Math.abs), 1e-9);
                  const yM = (v: number) => hOsc / 2 - (v / peak) * ((hOsc - 16) / 2);
                  return macd.hist.map((v, i) =>
                    v == null ? null : (
                      <rect
                        key={`m-${i}`}
                        x={xAt(i) - candleW / 2}
                        y={Math.min(yM(v), yM(0))}
                        width={candleW}
                        height={Math.max(1, Math.abs(yM(v) - yM(0)))}
                        fill={v >= 0 ? "rgba(89,196,142,0.55)" : "rgba(226,91,106,0.55)"}
                      />
                    ),
                  );
                })()
              : null}
            {showAdx
              ? (() => {
                  const last = lastFinite(adx);
                  return last != null ? (
                    <text x={w - padR - 40} y={12} fill="#7eb6ff" fontSize={9}>
                      ADX {last.toFixed(1)}
                    </text>
                  ) : null;
                })()
              : null}
          </g>
        ) : null}
      </svg>
      {atrLast != null ? (
        <p className={styles.chartMeta}>ATR (14) {atrLast.toFixed(4)} · {bars.length} bars · real MI series</p>
      ) : (
        <p className={styles.chartMeta}>{bars.length} bars · real MI series · no fabricated OHLC</p>
      )}
    </div>
  );
}
