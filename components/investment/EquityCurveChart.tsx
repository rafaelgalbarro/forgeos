"use client";

import styles from "@/styles/investment/workspace.module.css";

type Point = { index: number; equity: number };

/**
 * Lightweight SVG equity sparkline — no chart library, SSR-safe client island.
 */
export function EquityCurveChart({
  points,
  label,
}: {
  points: readonly Point[];
  label: string;
}) {
  if (points.length < 2) {
    return (
      <article className={styles.panel} aria-label={label}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>{label}</h2>
          <span className={styles.monitorWarn}>NO_DATA</span>
        </div>
        <p className={styles.hubNote}>Insufficient equity points for chart.</p>
      </article>
    );
  }

  const values = points.map((p) => p.equity);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 480;
  const h = 120;
  const pad = 8;
  const path = points
    .map((p, i) => {
      const x = pad + (i / (points.length - 1)) * (w - pad * 2);
      const y = h - pad - ((p.equity - min) / span) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <article className={styles.panel} aria-label={label}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>{label}</h2>
        <span className={styles.monitorOk}>{points.length} pts</span>
      </div>
      <svg
        className={styles.equityChartSvg}
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={120}
        role="img"
        aria-label={`${label} chart`}
      >
        <rect x="0" y="0" width={w} height={h} fill="rgba(8,12,18,0.4)" />
        <path d={path} fill="none" stroke="#59c48e" strokeWidth="2" />
      </svg>
      <ul className={styles.panelList}>
        <li>
          Min {min.toFixed(2)} · Max {max.toFixed(2)} · Last {values[values.length - 1]?.toFixed(2)}
        </li>
      </ul>
    </article>
  );
}
