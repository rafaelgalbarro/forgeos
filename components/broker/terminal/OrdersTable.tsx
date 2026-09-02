"use client";

import { maskAccountId } from "@/lib/ibkr/account-mask";
import { formatNumber, formatOptional, formatQty, noData } from "./format";
import styles from "./terminal.module.css";
import { useBrokerTerminal } from "./use-broker-terminal-data";

export function OrdersTable() {
  const { snapshot } = useBrokerTerminal();
  const { orders, sectionStates, errors } = snapshot;

  return (
    <section className={styles.section} data-panel-id="orders-table">
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Open orders ({orders.length})</h2>
        <p className={styles.sectionNote}>
          State: {sectionStates.orders}
          {errors.orders ? ` · ${errors.orders}` : ""} · read-only · zero orders sent from this UI
        </p>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>orderId</th>
              <th>permId</th>
              <th>Account</th>
              <th>Symbol</th>
              <th>Side</th>
              <th>Type</th>
              <th>Qty</th>
              <th>Limit</th>
              <th>Stop</th>
              <th>TIF</th>
              <th>Outside RTH</th>
              <th>Status</th>
              <th>Filled</th>
              <th>Remaining</th>
              <th>Avg fill</th>
              <th>createdAt</th>
              <th>updatedAt</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td className={styles.emptyCell} colSpan={17}>
                  No open orders
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={`${o.orderId}-${o.symbol}-${o.status}`}>
                  <td>{o.orderId}</td>
                  <td className={styles.emptyCell}>{formatOptional(o.permId)}</td>
                  <td>{o.account ? maskAccountId(o.account) : noData()}</td>
                  <td>{o.symbol}</td>
                  <td>{o.action}</td>
                  <td>{o.orderType}</td>
                  <td>{formatQty(o.quantity)}</td>
                  <td>{o.limitPrice != null ? formatNumber(o.limitPrice, 4) : noData()}</td>
                  <td className={styles.emptyCell}>{formatOptional(o.stopPrice)}</td>
                  <td className={styles.emptyCell}>{formatOptional(o.tif)}</td>
                  <td className={styles.emptyCell}>{formatOptional(o.outsideRth)}</td>
                  <td>{o.status || noData()}</td>
                  <td className={styles.emptyCell}>{formatOptional(o.filled)}</td>
                  <td className={styles.emptyCell}>{formatOptional(o.remaining)}</td>
                  <td className={styles.emptyCell}>{formatOptional(o.avgFillPrice)}</td>
                  <td className={styles.emptyCell}>{formatOptional(o.createdAt)}</td>
                  <td className={styles.emptyCell}>{formatOptional(o.updatedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
