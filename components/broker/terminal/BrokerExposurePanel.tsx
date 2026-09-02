"use client";

import { useMemo } from "react";
import { maskAccountId } from "@/lib/ibkr/account-mask";
import styles from "./terminal.module.css";
import { useBrokerTerminal } from "./use-broker-terminal-data";

type Bucket = { key: string; value: number; count: number };

function aggregate(
  rows: ReadonlyArray<{ key: string; value: number }>,
): Bucket[] {
  const map = new Map<string, { value: number; count: number }>();
  for (const row of rows) {
    if (!Number.isFinite(row.value) || row.value <= 0) continue;
    const cur = map.get(row.key) ?? { value: 0, count: 0 };
    cur.value += row.value;
    cur.count += 1;
    map.set(row.key, cur);
  }
  return [...map.entries()]
    .map(([key, v]) => ({ key, value: v.value, count: v.count }))
    .sort((a, b) => b.value - a.value);
}

function BarChart({
  title,
  buckets,
  emptyNote,
}: {
  title: string;
  buckets: readonly Bucket[];
  emptyNote: string;
}) {
  const max = buckets[0]?.value ?? 0;
  return (
    <article className={styles.section} data-panel-id={`exposure-${title}`}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <p className={styles.sectionNote}>
          {buckets.length ? `${buckets.length} buckets · cost basis` : "NO_DATA"}
        </p>
      </div>
      {buckets.length === 0 ? (
        <p className={styles.sectionNote}>{emptyNote}</p>
      ) : (
        <div className={styles.exposureBars}>
          {buckets.slice(0, 8).map((b) => {
            const pct = max > 0 ? (b.value / max) * 100 : 0;
            return (
              <div key={b.key} className={styles.exposureRow}>
                <span className={styles.exposureLabel}>{b.key}</span>
                <span className={styles.exposureTrack}>
                  <span className={styles.exposureFill} style={{ width: `${pct}%` }} />
                </span>
                <span className={styles.exposureValue}>
                  {b.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} · {b.count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

/**
 * Read-only exposure charts from IBKR positions.
 * Uses cost basis (|qty| × avgCost) — never invents market prices.
 * Market-value chart shows NO_DATA when quote enrichment absent.
 */
export function BrokerExposurePanel() {
  const { snapshot } = useBrokerTerminal();
  const { positions, sectionStates, dataSource } = snapshot;

  const open = useMemo(
    () => positions.filter((p) => p.position !== 0),
    [positions],
  );

  const byCurrency = useMemo(
    () =>
      aggregate(
        open.map((p) => ({
          key: p.currency || "NO_DATA",
          value: Math.abs(p.position) * (Number.isFinite(p.avgCost) ? p.avgCost : 0),
        })),
      ),
    [open],
  );

  const byAsset = useMemo(
    () =>
      aggregate(
        open.map((p) => ({
          key: p.secType || "NO_DATA",
          value: Math.abs(p.position) * (Number.isFinite(p.avgCost) ? p.avgCost : 0),
        })),
      ),
    [open],
  );

  const byAccount = useMemo(
    () =>
      aggregate(
        open.map((p) => ({
          key: maskAccountId(p.account),
          value: Math.abs(p.position) * (Number.isFinite(p.avgCost) ? p.avgCost : 0),
        })),
      ),
    [open],
  );

  const marketValueBuckets = useMemo(() => {
    const rows = open
      .map((p) => {
        const mv = p.marketValue;
        if (typeof mv !== "number" || !Number.isFinite(mv)) return null;
        return { key: p.currency || "NO_DATA", value: Math.abs(mv) };
      })
      .filter((r): r is { key: string; value: number } => r != null);
    return aggregate(rows);
  }, [open]);

  return (
    <section aria-label="Portfolio exposure" data-panel-id="broker-exposure">
      <div className={styles.sectionHeader} style={{ marginBottom: 8 }}>
        <h2 className={styles.sectionTitle}>Exposure</h2>
        <p className={styles.sectionNote}>
          {sectionStates.positions} · source {dataSource} · cost basis from IBKR avgCost (not invented marks)
        </p>
      </div>
      <div className={styles.exposureGrid}>
        <BarChart
          title="By currency (cost)"
          buckets={byCurrency}
          emptyNote="NO_DATA — no open positions"
        />
        <BarChart
          title="By asset class (cost)"
          buckets={byAsset}
          emptyNote="NO_DATA — no open positions"
        />
        <BarChart
          title="By account (cost)"
          buckets={byAccount}
          emptyNote="NO_DATA — no open positions"
        />
        <BarChart
          title="By currency (market value)"
          buckets={marketValueBuckets}
          emptyNote="NO_DATA — marketValue not provided by broker feed"
        />
      </div>
    </section>
  );
}
