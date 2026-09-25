"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import { getDataRefreshPolicy } from "@/lib/market-data/refresh-policy";
import styles from "@/styles/investment/markets-regional.module.css";

/** Sector ETF proxies for S&P 500 heatmap — expandable later. */
export const SECTOR_ETF_UNIVERSE = [
  { symbol: "XLK", name: "Technology", weight: 30 },
  { symbol: "XLF", name: "Financials", weight: 13 },
  { symbol: "XLV", name: "Health Care", weight: 12 },
  { symbol: "XLY", name: "Consumer Disc.", weight: 10 },
  { symbol: "XLC", name: "Communication", weight: 9 },
  { symbol: "XLI", name: "Industrials", weight: 8 },
  { symbol: "XLP", name: "Consumer Staples", weight: 6 },
  { symbol: "XLE", name: "Energy", weight: 4 },
  { symbol: "XLU", name: "Utilities", weight: 3 },
  { symbol: "XLRE", name: "Real Estate", weight: 2.5 },
  { symbol: "XLB", name: "Materials", weight: 2.5 },
] as const;

type HeatCell = {
  readonly symbol: string;
  readonly name: string;
  readonly weight: number;
  readonly changePct: number | null;
  readonly price: number | null;
  readonly loading: boolean;
};

type BatchQuotesResponse = {
  quotes?: Record<string, { price: number | null; changePct: number | null }>;
};

function heatBackground(changePct: number | null): string {
  if (changePct == null) return "rgba(47, 64, 84, 0.55)";
  const intensity = Math.min(1, Math.abs(changePct) / 2.5);
  if (changePct > 0) {
    return `rgba(89, 196, 142, ${0.18 + intensity * 0.72})`;
  }
  if (changePct < 0) {
    return `rgba(226, 91, 106, ${0.18 + intensity * 0.72})`;
  }
  return "rgba(47, 64, 84, 0.55)";
}

function formatPct(pct: number | null): string {
  if (pct == null) return "NO_DATA";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

/**
 * Sector heatmap (S&P 500 sector ETF proxies) — red/green by day %, size by ETF weight.
 * ANALYSIS_ONLY · batched Yahoo quotes · NO_DATA when missing.
 */
export function SectorHeatmap({
  pollMs,
  symbols,
}: {
  readonly pollMs?: number;
  readonly symbols?: readonly string[];
}) {
  const symbolKey = symbols?.slice().sort().join(",") ?? "";
  const universe = useMemo(() => {
    if (!symbolKey) return [...SECTOR_ETF_UNIVERSE];
    const allow = new Set(symbolKey.split(","));
    return SECTOR_ETF_UNIVERSE.filter((s) => allow.has(s.symbol));
  }, [symbolKey]);

  const [cells, setCells] = useState<HeatCell[]>(() =>
    universe.map((s) => ({
      symbol: s.symbol,
      name: s.name,
      weight: s.weight,
      changePct: null,
      price: null,
      loading: true,
    })),
  );
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setCells((prev) => prev.map((c) => ({ ...c, loading: c.price == null })));
    const res = await safeJsonFetch<BatchQuotesResponse>(
      `/api/investment/batch-quotes?symbols=${encodeURIComponent(
        universe.map((s) => s.symbol).join(","),
      )}`,
    );
    const quotes = res.data?.quotes ?? {};
    setCells(
      universe.map((s) => {
        const q = quotes[s.symbol];
        return {
          symbol: s.symbol,
          name: s.name,
          weight: s.weight,
          changePct: q?.changePct ?? null,
          price: q?.price ?? null,
          loading: false,
        } satisfies HeatCell;
      }),
    );
    setUpdatedAt(new Date().toISOString());
  }, [universe]);

  useEffect(() => {
    void refresh();
    const interval = pollMs ?? getDataRefreshPolicy().pollMs;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      void refresh();
    }, interval);
    return () => window.clearInterval(id);
  }, [pollMs, refresh]);

  const totalWeight = cells.reduce((acc, c) => acc + c.weight, 0) || 1;
  const ready = cells.filter((c) => c.changePct != null).length;

  return (
    <section className={styles.heatmapSection} aria-label="Sector heatmap">
      <header className={styles.heatmapHeader}>
        <div>
          <h2 className={styles.heatmapTitle}>Sector heatmap</h2>
          <p className={styles.heatmapMeta}>
            {universe.map((s) => s.symbol).join(" · ")} · color = 1d % · ANALYSIS_ONLY
          </p>
        </div>
        <div className={styles.heatmapActions}>
          <span className={styles.heatmapMeta}>
            {ready}/{cells.length} ready
            {updatedAt ? ` · ${new Date(updatedAt).toLocaleTimeString()}` : ""}
          </span>
          <button type="button" className={styles.refreshBtn} onClick={() => void refresh()}>
            Actualizar
          </button>
        </div>
      </header>

      {ready === 0 && !cells.some((c) => c.loading) ? (
        <p className={styles.heatmapEmpty}>NO_DATA — sector ETF quotes unavailable</p>
      ) : (
        <div className={styles.sectorHeatmap} role="list">
          {cells.map((cell) => {
            const flexGrow = Math.max(0.8, (cell.weight / totalWeight) * cells.length);
            return (
              <div
                key={cell.symbol}
                role="listitem"
                className={styles.sectorHeatCell}
                style={{
                  flexGrow,
                  flexBasis: `${Math.max(72, cell.weight * 6)}px`,
                  background: heatBackground(cell.changePct),
                }}
                title={`${cell.name} (${cell.symbol})`}
              >
                <span className={styles.sectorHeatSymbol}>{cell.symbol}</span>
                <span className={styles.sectorHeatName}>{cell.name}</span>
                <span className={styles.sectorHeatPct}>
                  {cell.loading ? "…" : formatPct(cell.changePct)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
