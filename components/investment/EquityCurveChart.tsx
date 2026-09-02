"use client";

import styles from "@/styles/investment/workspace.module.css";

type Point = { index: number; equity: number };

/**
 * Lightweight SVG equity sparkline — no chart library, SSR-safe client island.
 */
export function EquityCurveChart({
  points,
  label,
  variant = "line",
  compact = false,
}: {
  points: readonly Point[];
  label: string;
  variant?: "line" | "area";
  compact?: boolean;
}) {
  if (points.length < 2) {
    return (
      <article className={compact ? styles.equityChartCompact : styles.panel} aria-label={label}>
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
  const h = compact ? 96 : 120;
  const pad = 8;
  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = h - pad - ((p.equity - min) / span) * (h - pad * 2);
    return { x, y };
  });
  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1]!.x.toFixed(1)},${(h - pad).toFixed(1)} L${coords[0]!.x.toFixed(1)},${(h - pad).toFixed(1)} Z`;

  return (
    <article className={compact ? styles.equityChartCompact : styles.panel} aria-label={label}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>{label}</h2>
        <span className={styles.monitorOk}>{points.length} pts</span>
      </div>
      <svg
        className={styles.equityChartSvg}
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        role="img"
        aria-label={`${label} chart`}
      >
        <defs>
          <linearGradient id="navAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0, 208, 132, 0.35)" />
            <stop offset="100%" stopColor="rgba(0, 208, 132, 0.02)" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={w} height={h} fill="rgba(8,12,18,0.4)" />
        {variant === "area" ? <path d={areaPath} fill="url(#navAreaFill)" stroke="none" /> : null}
        <path d={linePath} fill="none" stroke="#00d084" strokeWidth="2" />
      </svg>
      {!compact ? (
        <ul className={styles.panelList}>
          <li>
            Min {min.toFixed(2)} · Max {max.toFixed(2)} · Last {values[values.length - 1]?.toFixed(2)}
          </li>
        </ul>
      ) : null}
    </article>
  );
}
