"use client";

import { useEffect, useRef, useState } from "react";
import { EquityCurveChart } from "@/components/investment/EquityCurveChart";
import type {
  EquityPoint,
  PortfolioPositionRow,
} from "@/lib/investment/portfolio-management.types";
import styles from "@/styles/investment/portfolio-management.module.css";

const DAY_KEY = "forgeos-portfolio-day-equity";

type DaySample = { t: string; equity: number };

function readDaySamples(day: string): DaySample[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(DAY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { day?: string; samples?: DaySample[] };
    if (parsed.day !== day || !Array.isArray(parsed.samples)) return [];
    return parsed.samples.filter(
      (s) => typeof s?.t === "string" && typeof s?.equity === "number" && Number.isFinite(s.equity),
    );
  } catch {
    return [];
  }
}

function writeDaySamples(day: string, samples: readonly DaySample[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    DAY_KEY,
    JSON.stringify({ day, samples: samples.slice(-240) }),
  );
}

function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "NO_DATA";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function pnlClass(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return "";
  return n > 0 ? styles.pnlPos : styles.pnlNeg;
}

/**
 * Real-time P&L by position + intraday equity curve samples.
 * Parent polls ~10s; this panel records NAV samples for the day when available.
 */
export function LivePositionPnlPanel({
  positions,
  portfolioValue,
  equityCurve,
  generatedAt,
}: {
  readonly positions: readonly PortfolioPositionRow[];
  readonly portfolioValue: number | null;
  readonly equityCurve: readonly EquityPoint[];
  readonly generatedAt: string | null;
}) {
  const [dayCurve, setDayCurve] = useState<EquityPoint[]>([]);
  const lastSampleAt = useRef(0);

  useEffect(() => {
    if (portfolioValue == null || !Number.isFinite(portfolioValue)) return;
    const day = new Date().toISOString().slice(0, 10);
    const now = Date.now();
    // Throttle samples to ~10s even if parent re-renders faster.
    if (now - lastSampleAt.current < 9_000) {
      setDayCurve(
        readDaySamples(day).map((s, i) => ({ index: i, equity: s.equity })),
      );
      return;
    }
    lastSampleAt.current = now;
    const samples = readDaySamples(day);
    samples.push({ t: new Date().toISOString(), equity: portfolioValue });
    writeDaySamples(day, samples);
    setDayCurve(samples.map((s, i) => ({ index: i, equity: s.equity })));
  }, [portfolioValue, generatedAt]);

  const curvePoints =
    dayCurve.length >= 2
      ? dayCurve
      : equityCurve.length >= 2
        ? equityCurve
        : dayCurve;

  const ranked = [...positions].sort((a, b) => Math.abs(b.pnl ?? 0) - Math.abs(a.pnl ?? 0));

  return (
    <section className={styles.section} aria-label="Live P&L by position">
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>P&L en vivo</h2>
        <p className={styles.sectionNote}>
          Refresh ~10s · ANALYSIS_ONLY · {generatedAt ? new Date(generatedAt).toLocaleTimeString() : "—"}
        </p>
      </div>

      {ranked.length === 0 ? (
        <p className={styles.chartEmpty}>NO_DATA — no open positions</p>
      ) : (
        <ul className={styles.livePnlList}>
          {ranked.map((row) => (
            <li key={`${row.ticker}-${row.currency}-${row.secType}`} className={styles.livePnlRow}>
              <div className={styles.livePnlMain}>
                <span className={styles.livePnlTicker}>{row.ticker}</span>
                <span className={styles.livePnlMeta}>
                  qty {fmtNum(row.quantity, 4)} · px {fmtNum(row.currentPrice)}
                </span>
              </div>
              <div className={styles.livePnlVals}>
                <span className={`${styles.livePnlValue} ${pnlClass(row.pnl)}`}>
                  {fmtNum(row.pnl)}
                </span>
                <span className={`${styles.livePnlPct} ${pnlClass(row.returnPct)}`}>
                  {row.returnPct == null ? "NO_DATA" : `${row.returnPct.toFixed(2)}%`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.dayEquityWrap}>
        {curvePoints.length >= 2 ? (
          <EquityCurveChart
            points={curvePoints}
            label={dayCurve.length >= 2 ? "Equity curve · day" : "Equity curve"}
          />
        ) : (
          <p className={styles.chartEmpty}>
            NO_DATA — day equity curve needs ≥2 NAV samples (collects on live refresh)
          </p>
        )}
      </div>
    </section>
  );
}
