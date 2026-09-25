"use client";

import { maskAccountId } from "@/lib/ibkr/account-mask";
import { formatMoney, formatNumber, noData, parseTagNumber, sumTagValues } from "./format";
import styles from "./terminal.module.css";
import { useBrokerTerminal } from "./use-broker-terminal-data";

type MetricDef = {
  key: string;
  label: string;
  importance: "primary" | "secondary" | "tertiary";
  pnl?: boolean;
};

const METRICS: MetricDef[] = [
  { key: "NetLiquidation", label: "Net Liquidation", importance: "primary" },
  { key: "AvailableFunds", label: "Available Funds", importance: "primary" },
  { key: "BuyingPower", label: "Buying Power", importance: "primary" },
  { key: "TotalCashValue", label: "Total Cash", importance: "secondary" },
  { key: "GrossPositionValue", label: "Gross Position Value", importance: "secondary" },
  { key: "UnrealizedPnL", label: "Unrealized P&L", importance: "secondary", pnl: true },
  { key: "RealizedPnL", label: "Realized P&L", importance: "secondary", pnl: true },
  { key: "MaintMarginReq", label: "Maintenance Margin", importance: "tertiary" },
];

function pnlClass(n: number | null): string {
  if (n == null) return "";
  if (n > 0) return styles.metricPos;
  if (n < 0) return styles.metricNeg;
  return styles.metricFlat;
}

export function AccountSummaryCards() {
  const { snapshot } = useBrokerTerminal();
  const { account, positions, orders, sectionStates, errors, dataSource } = snapshot;
  const positionCount = positions.filter((p) => p.position !== 0).length;
  const openOrdersCount = orders.length;

  return (
    <section className={styles.section} data-panel-id="account-summary">
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Account metrics</h2>
        <p className={styles.sectionNote}>
          {sectionStates.summary}
          {dataSource === "DEMO" ? " · DEMO" : ""}
          {errors.account ? ` · ${errors.account}` : ""}
        </p>
      </div>

      <div className={styles.metricHierarchy}>
        {METRICS.map((tag) => {
          const { total, currency } = sumTagValues(account, tag.key);
          const value =
            total == null
              ? noData()
              : `${formatNumber(total)}${currency ? ` ${currency}` : ""}`;
          return (
            <article
              key={tag.key}
              className={`${styles.metricCard} ${
                tag.importance === "primary"
                  ? styles.metricPrimary
                  : tag.importance === "secondary"
                    ? styles.metricSecondary
                    : styles.metricTertiary
              }`}
              title={`${tag.label} · ${dataSource}`}
            >
              <div className={styles.metricLabel}>{tag.label}</div>
              <div className={`${styles.metricValue} ${tag.pnl ? pnlClass(total) : ""}`}>{value}</div>
              <div className={styles.metricState}>
                {total == null ? "NO_DATA" : currency || "READY"}
              </div>
            </article>
          );
        })}
        <article className={`${styles.metricCard} ${styles.metricTertiary}`} title="Daily P&L">
          <div className={styles.metricLabel}>Daily P&L</div>
          <div className={styles.metricValue}>{noData()}</div>
          <div className={styles.metricState}>NO_DATA</div>
        </article>
        <article className={`${styles.metricCard} ${styles.metricSecondary}`}>
          <div className={styles.metricLabel}>Open Positions</div>
          <div className={styles.metricValue}>{String(positionCount)}</div>
          <div className={styles.metricState}>COUNT</div>
        </article>
        <article className={`${styles.metricCard} ${styles.metricTertiary}`}>
          <div className={styles.metricLabel}>Open Orders</div>
          <div className={styles.metricValue}>{String(openOrdersCount)}</div>
          <div className={styles.metricState}>READ_ONLY</div>
        </article>
      </div>

      {account && Object.keys(account).length > 0
        ? Object.entries(account).map(([acct, tags]) => {
            const nl = parseTagNumber(tags.NetLiquidation);
            return (
              <div key={acct} className={styles.accountBlock}>
                <h3 className={styles.accountTitle}>
                  Account {maskAccountId(acct)}
                  <span className={styles.sectionNote} style={{ marginLeft: 8 }}>
                    NL {nl == null ? noData() : formatMoney(tags.NetLiquidation)}
                  </span>
                </h3>
                <div className={styles.metricHierarchyCompact}>
                  {METRICS.slice(0, 6).map((tag) => (
                    <article key={tag.key} className={styles.metricCardCompact}>
                      <div className={styles.metricLabel}>{tag.label}</div>
                      <div className={styles.metricValueCompact}>{formatMoney(tags[tag.key])}</div>
                    </article>
                  ))}
                  <article className={styles.metricCardCompact}>
                    <div className={styles.metricLabel}>Positions</div>
                    <div className={styles.metricValueCompact}>
                      {String(positions.filter((p) => p.account === acct && p.position !== 0).length)}
                    </div>
                  </article>
                </div>
              </div>
            );
          })
        : (
          <p className={styles.sectionNote} style={{ marginTop: 10 }}>
            Per-account breakdown: {noData()}
          </p>
        )}
    </section>
  );
}
