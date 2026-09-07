"use client";

import type { AllocationBucket, EquityPoint } from "@/lib/investment/portfolio-management.types";
import styles from "@/styles/investment/portfolio-management.module.css";

const PALETTE = [
  "#3a7bd5",
  "#59c48e",
  "#f0b46a",
  "#c77dff",
  "#4ecdc4",
  "#e07070",
  "#7f96ad",
  "#f8b84e",
  "#6c8cff",
  "#a8d5a2",
];

function usableBuckets(buckets: readonly AllocationBucket[]): AllocationBucket[] {
  return buckets.filter((b) => (b.weightPct ?? 0) > 0 || (b.exposure ?? 0) > 0).slice(0, 10);
}

function weightOf(b: AllocationBucket): number {
  return Math.max(0, b.weightPct ?? 0);
}

export function AllocationPieChart({
  title,
  buckets,
}: {
  title: string;
  buckets: readonly AllocationBucket[];
}) {
  const rows = usableBuckets(buckets);
  if (rows.length === 0) {
    return (
      <article className={styles.chartPanel} aria-label={title}>
        <h3 className={styles.chartTitle}>{title}</h3>
        <p className={styles.chartEmpty}>NO_DATA</p>
      </article>
    );
  }

  const total = rows.reduce((s, b) => s + weightOf(b), 0) || 1;
  const size = 112;
  const r = 44;
  const cx = size / 2;
  const cy = size / 2;
  let angle = -Math.PI / 2;
  const slices = rows.map((b, i) => {
    const portion = weightOf(b) / total;
    const sweep = portion * Math.PI * 2;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += sweep;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    const d =
      portion >= 0.999
        ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return { b, d, color: PALETTE[i % PALETTE.length]!, portion };
  });

  return (
    <article className={styles.chartPanel} aria-label={title}>
      <h3 className={styles.chartTitle}>{title}</h3>
      <div className={styles.pieWrap}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img">
          {slices.map((s) => (
            <path key={s.b.key} d={s.d} fill={s.color} stroke="rgba(8,12,18,0.6)" strokeWidth="1" />
          ))}
        </svg>
        <ul className={styles.pieLegend}>
          {slices.map((s) => (
            <li key={s.b.key}>
              <span className={styles.swatch} style={{ background: s.color }} />
              <span>{s.b.label}</span>
              <span>{(s.portion * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

/** Simple row-based treemap (proportional flex widths) — no chart library. */
export function AllocationTreemap({
  title,
  buckets,
}: {
  title: string;
  buckets: readonly AllocationBucket[];
}) {
  const rows = usableBuckets(buckets);
  if (rows.length === 0) {
    return (
      <article className={styles.chartPanel} aria-label={title}>
        <h3 className={styles.chartTitle}>{title}</h3>
        <p className={styles.chartEmpty}>NO_DATA</p>
      </article>
    );
  }

  const total = rows.reduce((s, b) => s + weightOf(b), 0) || 1;
  const top = rows.slice(0, 6);
  const restW = rows.slice(6).reduce((s, b) => s + weightOf(b), 0);

  return (
    <article className={styles.chartPanel} aria-label={title}>
      <h3 className={styles.chartTitle}>{title}</h3>
      <div
        className={styles.treemap}
        style={{
          gridTemplateColumns: top
            .map((b) => `minmax(0, ${Math.max(weightOf(b) / total, 0.08)}fr)`)
            .concat(restW > 0 ? [`minmax(0, ${Math.max(restW / total, 0.08)}fr)`] : [])
            .join(" "),
        }}
      >
        {top.map((b, i) => (
          <div
            key={b.key}
            className={styles.treemapCell}
            style={{ background: PALETTE[i % PALETTE.length] }}
            title={`${b.label}: ${weightOf(b).toFixed(1)}%`}
          >
            <span className={styles.treemapLabel}>{b.label}</span>
            <span className={styles.treemapValue}>{weightOf(b).toFixed(1)}%</span>
          </div>
        ))}
        {restW > 0 ? (
          <div
            className={styles.treemapCell}
            style={{ background: PALETTE[top.length % PALETTE.length] }}
          >
            <span className={styles.treemapLabel}>Other</span>
            <span className={styles.treemapValue}>{restW.toFixed(1)}%</span>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function AllocationHeatmap({
  title,
  buckets,
}: {
  title: string;
  buckets: readonly AllocationBucket[];
}) {
  const rows = usableBuckets(buckets);
  if (rows.length === 0) {
    return (
      <article className={styles.chartPanel} aria-label={title}>
        <h3 className={styles.chartTitle}>{title}</h3>
        <p className={styles.chartEmpty}>NO_DATA</p>
      </article>
    );
  }

  const max = Math.max(...rows.map(weightOf), 1);

  return (
    <article className={styles.chartPanel} aria-label={title}>
      <h3 className={styles.chartTitle}>{title}</h3>
      <div className={styles.heatmap}>
        {rows.map((b) => {
          const w = weightOf(b);
          const intensity = w / max;
          const bg = `rgba(58, 123, 213, ${0.15 + intensity * 0.75})`;
          return (
            <div key={b.key} className={styles.heatCell} style={{ background: bg }}>
              <span className={styles.heatLabel}>{b.label}</span>
              <span className={styles.heatValue}>{w.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export function AllocationTimeline({
  title,
  points,
}: {
  title: string;
  points: readonly EquityPoint[];
}) {
  if (points.length < 2) {
    return (
      <article className={`${styles.chartPanel} ${styles.chartPanelWide}`} aria-label={title}>
        <h3 className={styles.chartTitle}>{title}</h3>
        <p className={styles.chartEmpty}>NO_DATA</p>
      </article>
    );
  }

  const values = points.map((p) => p.equity);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 480;
  const h = 110;
  const pad = 8;
  const path = points
    .map((p, i) => {
      const x = pad + (i / (points.length - 1)) * (w - pad * 2);
      const y = h - pad - ((p.equity - min) / span) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <article className={`${styles.chartPanel} ${styles.chartPanelWide}`} aria-label={title}>
      <h3 className={styles.chartTitle}>{title}</h3>
      <svg className={styles.timelineSvg} viewBox={`0 0 ${w} ${h}`} width="100%" height={110} role="img">
        <rect x="0" y="0" width={w} height={h} fill="rgba(8,12,18,0.4)" />
        <path d={path} fill="none" stroke="#59c48e" strokeWidth="2" />
      </svg>
    </article>
  );
}
