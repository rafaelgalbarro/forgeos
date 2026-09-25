"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineSeries,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  type Time,
  type SeriesMarker,
} from "lightweight-charts";

export type CandleBar = {
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume?: number;
  readonly date?: string;
  readonly timestamp?: string;
};

export type ChartSignalOverlay = {
  readonly direction: "BUY" | "SELL" | "HOLD";
  readonly confidence?: number;
  readonly label?: string;
};

export type ChartLineOverlay = {
  readonly id: string;
  readonly color: string;
  /** Constant horizontal level, or parallel array of values (null = gap). */
  readonly value?: number | null;
  readonly values?: readonly (number | null)[];
};

type Props = {
  readonly bars: readonly CandleBar[];
  readonly symbol: string;
  readonly height?: number;
  readonly signal?: ChartSignalOverlay | null;
  readonly lines?: readonly ChartLineOverlay[];
  readonly className?: string;
  readonly emptyClassName?: string;
};

function toUnixTime(bar: CandleBar, index: number, total: number): Time {
  const raw = bar.timestamp ?? bar.date;
  if (raw) {
    const ms = Date.parse(raw);
    if (Number.isFinite(ms)) {
      return Math.floor(ms / 1000) as Time;
    }
    // Yahoo-style YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw as Time;
    }
  }
  // Synthetic sequential days ending today — only for display when dates missing.
  const end = Date.UTC(2020, 0, 1) + (index + 1) * 86_400_000;
  void total;
  return Math.floor(end / 1000) as Time;
}

function buildCandleData(bars: readonly CandleBar[]): CandlestickData<Time>[] {
  const out: CandlestickData<Time>[] = [];
  let lastTime = 0;
  for (let i = 0; i < bars.length; i += 1) {
    const b = bars[i]!;
    if (
      !Number.isFinite(b.open) ||
      !Number.isFinite(b.high) ||
      !Number.isFinite(b.low) ||
      !Number.isFinite(b.close)
    ) {
      continue;
    }
    let t = toUnixTime(b, i, bars.length);
    const n = typeof t === "number" ? t : 0;
    if (typeof t === "number" && n <= lastTime) {
      t = (lastTime + 86_400) as Time;
    }
    if (typeof t === "number") lastTime = t as number;
    out.push({
      time: t,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    });
  }
  return out;
}

/**
 * Interactive TradingView Lightweight Charts candlestick — ANALYSIS_ONLY.
 * Empty / insufficient bars → NO_DATA (never fabricates OHLC).
 */
export function LightweightCandleChart({
  bars,
  symbol,
  height = 280,
  signal = null,
  lines = [],
  className,
  emptyClassName,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const linesKey = JSON.stringify(lines);
  const signalKey = signal
    ? `${signal.direction}:${signal.confidence ?? ""}:${signal.label ?? ""}`
    : "";
  const barsKey = `${bars.length}:${bars[0]?.close ?? ""}:${bars[bars.length - 1]?.close ?? ""}:${bars[0]?.timestamp ?? bars[0]?.date ?? ""}`;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || bars.length < 2) return;

    const candleData = buildCandleData(bars);
    if (candleData.length < 2) return;

    const chart = createChart(el, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "rgba(8,12,18,0.55)" },
        textColor: "#9fb4c9",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(47,64,84,0.45)" },
        horzLines: { color: "rgba(47,64,84,0.45)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "rgba(47,64,84,0.9)" },
      timeScale: {
        borderColor: "rgba(47,64,84,0.9)",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#59c48e",
      downColor: "#e25b6a",
      borderUpColor: "#59c48e",
      borderDownColor: "#e25b6a",
      wickUpColor: "#59c48e",
      wickDownColor: "#e25b6a",
    });
    candleSeries.setData(candleData);

    const lineSeries: ISeriesApi<"Line">[] = [];
    for (const line of lines) {
      const series = chart.addSeries(LineSeries, {
        color: line.color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        title: line.id,
      });
      if (typeof line.value === "number" && Number.isFinite(line.value)) {
        series.setData(
          candleData.map((c) => ({ time: c.time, value: line.value as number })),
        );
      } else if (line.values && line.values.length) {
        const pts: LineData<Time>[] = [];
        for (let i = 0; i < candleData.length; i += 1) {
          const v = line.values[i];
          if (typeof v === "number" && Number.isFinite(v)) {
            pts.push({ time: candleData[i]!.time, value: v });
          }
        }
        if (pts.length) series.setData(pts);
      }
      lineSeries.push(series);
    }

    if (signal && signal.direction !== "HOLD" && candleData.length) {
      const last = candleData[candleData.length - 1]!;
      const markers: SeriesMarker<Time>[] = [
        {
          time: last.time,
          position: signal.direction === "BUY" ? "belowBar" : "aboveBar",
          color: signal.direction === "BUY" ? "#59c48e" : "#e25b6a",
          shape: signal.direction === "BUY" ? "arrowUp" : "arrowDown",
          text:
            signal.label ??
            `${signal.direction}${
              signal.confidence != null ? ` ${(signal.confidence * 100).toFixed(0)}%` : ""
            }`,
        },
      ];
      createSeriesMarkers(candleSeries, markers);
    }

    chart.timeScale().fitContent();

    const ro = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver((entries) => {
          const w = entries[0]?.contentRect.width;
          if (typeof w === "number" && w > 0) {
            chart.applyOptions({ width: Math.floor(w) });
          }
        })
      : null;
    ro?.observe(el);
    chart.applyOptions({ width: el.clientWidth || 360 });

    return () => {
      ro?.disconnect();
      for (const s of lineSeries) {
        try {
          chart.removeSeries(s);
        } catch {
          /* ignore */
        }
      }
      chart.remove();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by content hashes
  }, [barsKey, height, linesKey, signalKey, symbol]);

  if (bars.length < 2) {
    return (
      <div
        className={emptyClassName}
        role="img"
        aria-label={`${symbol} chart unavailable`}
      >
        <span>NO_DATA</span>
        <p>No OHLC series for {symbol}. Candles are not fabricated.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      role="img"
      aria-label={`${symbol} interactive candlestick chart`}
      style={{ width: "100%", minHeight: height, touchAction: "pan-y" }}
    />
  );
}
