import type { ResearchEngine, ResearchEngineContext } from "./contract";
import { baseResult } from "./contract";

/**
 * Quant factors / correlations / regimes.
 * Uses multi-symbol closes when available; otherwise STUB/NO_DATA (no DEMO fabrication).
 */
export const quantEngine: ResearchEngine = {
  id: "quant",
  title: "Quant Engine",
  description: "Factors, pairwise return correlation, simple regime tag from available bars.",
  resolveWiring(ctx) {
    if (ctx.marketProviders.length === 0) return "CONFIG_REQUIRED";
    return "LIVE";
  },
  run(ctx: ResearchEngineContext) {
    if (ctx.marketProviders.length === 0) {
      return baseResult(
        "quant",
        "Quant Engine",
        {
          status: "CONFIG_REQUIRED",
          summary: "No market providers for quant inputs.",
          lines: ["CONFIG_REQUIRED"],
          itemCount: 0,
          providers: [],
          evidence: [],
          signal: null,
        },
        ctx.generatedAt,
      );
    }

    const snaps = ctx.mi?.marketSnapshots ?? [];
    const series = snaps
      .map((s) => ({
        symbol: s.symbol,
        closes: (s.timeSeries?.points ?? []).map((p) => p.close),
      }))
      .filter((s) => s.closes.length >= 5);

    if (!series.length) {
      return baseResult(
        "quant",
        "Quant Engine",
        {
          status: "NO_DATA",
          summary: "Insufficient history for factors/correlations.",
          lines: ["NO_DATA — need ≥5 bars on at least one symbol"],
          itemCount: 0,
          providers: ctx.marketProviders,
          evidence: [],
          signal: null,
        },
        ctx.generatedAt,
      );
    }

    const focus = series.find((s) => s.symbol.toUpperCase() === ctx.symbol.toUpperCase()) ?? series[0]!;
    const rets: number[] = [];
    for (let i = 1; i < focus.closes.length; i++) {
      const prev = focus.closes[i - 1]!;
      if (prev !== 0) rets.push((focus.closes[i]! - prev) / prev);
    }
    const vol =
      rets.length > 1
        ? Math.sqrt(rets.reduce((a, r) => a + r * r, 0) / rets.length)
        : null;
    const mean = rets.length ? rets.reduce((a, b) => a + b, 0) / rets.length : null;
    const regime =
      vol == null
        ? "NO_DATA"
        : vol > 0.03
          ? "high-volatility"
          : mean != null && mean > 0.001
            ? "bullish"
            : mean != null && mean < -0.001
              ? "bearish"
              : "sideways";

    let corrLine = "Pairwise correlation: NO_DATA (need second series)";
    if (series.length >= 2) {
      const a = series[0]!;
      const b = series[1]!;
      const n = Math.min(a.closes.length, b.closes.length);
      if (n >= 5) {
        const ra: number[] = [];
        const rb: number[] = [];
        for (let i = 1; i < n; i++) {
          ra.push((a.closes[i]! - a.closes[i - 1]!) / a.closes[i - 1]!);
          rb.push((b.closes[i]! - b.closes[i - 1]!) / b.closes[i - 1]!);
        }
        const ma = ra.reduce((x, y) => x + y, 0) / ra.length;
        const mb = rb.reduce((x, y) => x + y, 0) / rb.length;
        let num = 0;
        let da = 0;
        let db = 0;
        for (let i = 0; i < ra.length; i++) {
          const xa = ra[i]! - ma;
          const xb = rb[i]! - mb;
          num += xa * xb;
          da += xa * xa;
          db += xb * xb;
        }
        const corr = da > 0 && db > 0 ? num / Math.sqrt(da * db) : null;
        corrLine =
          corr != null
            ? `Corr(${a.symbol},${b.symbol}): ${corr.toFixed(3)}`
            : "Pairwise correlation: NO_DATA";
      }
    }

    const lines = [
      `Focus: ${focus.symbol}`,
      `Returns sample: ${rets.length}`,
      vol != null ? `Vol (approx): ${(vol * 100).toFixed(2)}%` : "Vol: NO_DATA",
      `Regime tag: ${regime}`,
      corrLine,
    ];

    return baseResult(
      "quant",
      "Quant Engine",
      {
        status: series.length >= 2 ? "LIVE" : "PARTIAL",
        summary: `Quant snapshot for ${focus.symbol} (regime=${regime}).`,
        lines,
        itemCount: rets.length,
        providers: ctx.marketProviders,
        evidence: [`regime:${regime}`, `n:${rets.length}`],
        signal: vol != null ? Math.max(20, Math.min(80, 100 - vol * 800)) : 40,
      },
      ctx.generatedAt,
    );
  },
};
