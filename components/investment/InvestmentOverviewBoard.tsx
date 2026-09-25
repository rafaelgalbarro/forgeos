"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "@/styles/investment/workspace.module.css";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import { getUsCloseCountdown } from "@/lib/investment/us-session-countdown";
import { EquityCurveChart } from "@/components/investment/EquityCurveChart";
import { SectorHeatmap } from "@/components/investment/SectorHeatmap";

const POLL_MS = 30_000;
const TICK_MS = 1_000;

/** Block 6 focus sectors. */
const OVERVIEW_SECTORS = ["XLK", "XLF", "XLE", "XLV", "XLI"] as const;

type HeaderQuotes = {
  nav: number | null;
  dailyPnl: number | null;
  dailyPnlPct: number | null;
  spy?: { changePct: number | null };
  error?: string;
};

type PortfolioPayload = {
  equityCurve?: Array<{ index: number; equity: number }>;
  summary?: { pnlDaily?: { value?: number | null } };
};

function fmtMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "NO_DATA";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "NO_DATA";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

/**
 * Block 6 — Bloomberg-style overview: NAV area chart, large P&L, sector heatmap,
 * USA close countdown, performance vs SPY.
 */
export function InvestmentOverviewBoard() {
  const [quotes, setQuotes] = useState<HeaderQuotes | null>(null);
  const [curve, setCurve] = useState<Array<{ index: number; equity: number }>>([]);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(() => getUsCloseCountdown());

  useEffect(() => {
    const t = setInterval(() => setCountdown(getUsCloseCountdown()), TICK_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [hq, port] = await Promise.all([
        safeJsonFetch<HeaderQuotes & { error?: string }>("/api/investment/header-quotes", {
          cache: "no-store",
        }),
        safeJsonFetch<PortfolioPayload>("/api/investment/portfolio", { cache: "no-store" }),
      ]);
      if (cancelled) return;
      if (hq.ok && hq.data) {
        setQuotes({
          nav: hq.data.nav ?? null,
          dailyPnl: hq.data.dailyPnl ?? null,
          dailyPnlPct: hq.data.dailyPnlPct ?? null,
          spy: { changePct: hq.data.spy?.changePct ?? null },
        });
        setError(hq.data.error ?? "");
      } else {
        setError(hq.error ?? "Header quotes unavailable");
      }
      if (port.ok && port.data?.equityCurve && port.data.equityCurve.length >= 2) {
        setCurve(port.data.equityCurve.map((p) => ({ index: p.index, equity: p.equity })));
      } else if (hq.ok && hq.data?.nav != null && Number.isFinite(hq.data.nav)) {
        const nav = hq.data.nav as number;
        const pnl = hq.data.dailyPnl ?? 0;
        setCurve([
          { index: 0, equity: nav - (pnl ?? 0) },
          { index: 1, equity: nav },
        ]);
      }
    }

    void load();
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void load();
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const pnl = quotes?.dailyPnl ?? null;
  const pnlPct = quotes?.dailyPnlPct ?? null;
  const spyPct = quotes?.spy?.changePct ?? null;
  const vsSpy =
    pnlPct != null && spyPct != null && Number.isFinite(pnlPct) && Number.isFinite(spyPct)
      ? pnlPct - spyPct
      : null;

  const pnlTone =
    pnl == null
      ? styles.overviewPnlFlat
      : pnl > 0
        ? styles.overviewPnlUp
        : pnl < 0
          ? styles.overviewPnlDown
          : styles.overviewPnlFlat;

  const vsTone =
    vsSpy == null
      ? ""
      : vsSpy >= 0
        ? styles.overviewPnlUp
        : styles.overviewPnlDown;

  const curvePoints = useMemo(() => curve, [curve]);

  return (
    <section className={styles.overviewBoard} aria-label="Investment overview">
      <div className={styles.overviewHero}>
        <div className={styles.overviewPnlBlock}>
          <p className={styles.overviewLabel}>P&amp;L del día</p>
          <p className={`${styles.overviewPnlValue} ${pnlTone}`} data-numeric="true">
            {fmtMoney(pnl)}
          </p>
          <p className={`${styles.overviewPnlPct} ${pnlTone}`} data-numeric="true">
            {fmtPct(pnlPct)}
          </p>
          <p className={styles.overviewNavLine}>
            NAV <strong data-numeric="true">{fmtMoney(quotes?.nav)}</strong>
          </p>
        </div>

        <div className={styles.overviewChartWrap}>
          <EquityCurveChart points={curvePoints} label="NAV en tiempo real" variant="area" compact />
        </div>

        <div className={styles.overviewSideMetrics}>
          <div className={styles.overviewMetricCard}>
            <p className={styles.overviewLabel}>{countdown.targetLabel}</p>
            <p className={styles.overviewCountdown} data-numeric="true">
              {countdown.label}
            </p>
            <p className={styles.overviewHint}>{countdown.phase}</p>
          </div>
          <div className={styles.overviewMetricCard}>
            <p className={styles.overviewLabel}>vs S&amp;P 500 (SPY)</p>
            <p className={`${styles.overviewVsSpy} ${vsTone}`} data-numeric="true">
              {vsSpy == null ? "NO_DATA" : fmtPct(vsSpy)}
            </p>
            <p className={styles.overviewHint}>
              Portfolio {fmtPct(pnlPct)} · SPY {fmtPct(spyPct)}
            </p>
          </div>
        </div>
      </div>

      <div className={styles.overviewHeatWrap}>
        <SectorHeatmap pollMs={60_000} symbols={[...OVERVIEW_SECTORS]} />
      </div>

      {error ? <p className={styles.overviewError}>{error}</p> : null}
    </section>
  );
}
