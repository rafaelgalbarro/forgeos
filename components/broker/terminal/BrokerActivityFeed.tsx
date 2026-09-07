"use client";

import { useMemo } from "react";
import styles from "./terminal.module.css";
import { useBrokerTerminal } from "./use-broker-terminal-data";

type ActivityItem = {
  id: string;
  at: string;
  kind: "sync" | "error" | "status" | "warn";
  text: string;
};

/**
 * Broker activity feed — derived from terminal snapshot only.
 * No order events; no broker mutation.
 */
export function BrokerActivityFeed() {
  const { snapshot, message } = useBrokerTerminal();
  const { lastSyncAt, errors, status, degraded, dataSource, marketData, latencyMs } = snapshot;

  const items = useMemo(() => {
    const rows: ActivityItem[] = [];
    const now = lastSyncAt ?? new Date().toISOString();

    if (lastSyncAt) {
      rows.push({
        id: "sync",
        at: lastSyncAt,
        kind: "sync",
        text: `Sync complete · latency ${typeof latencyMs === "number" ? `${latencyMs}ms` : "NO_DATA"} · source ${dataSource}`,
      });
    }

    if (status?.connected === false) {
      rows.push({
        id: "disc",
        at: now,
        kind: "warn",
        text: "IBKR disconnected — last-known portfolio retained when available",
      });
    } else if (status?.connected === true) {
      rows.push({
        id: "conn",
        at: now,
        kind: "status",
        text: `Connected · nextValidId ${status.nextValidId ?? "NO_DATA"} · market ${marketData}`,
      });
    }

    if (degraded) {
      rows.push({
        id: "deg",
        at: now,
        kind: "warn",
        text: "Degraded / partial data — UI remains interactive, no orders",
      });
    }

    if (marketData === "DELAYED" || marketData === "UNAVAILABLE") {
      rows.push({
        id: "md",
        at: now,
        kind: "warn",
        text: `Market data ${marketData} — NO_TRADE gate applies`,
      });
    }

    for (const [key, err] of Object.entries(errors)) {
      if (!err) continue;
      rows.push({
        id: `err-${key}`,
        at: now,
        kind: "error",
        text: `${key}: ${err}`,
      });
    }

    if (message) {
      rows.push({
        id: "msg",
        at: now,
        kind: "status",
        text: message,
      });
    }

    if (rows.length === 0) {
      rows.push({
        id: "empty",
        at: now,
        kind: "status",
        text: "No recent broker events · waiting for first sync",
      });
    }

    return rows.slice(0, 12);
  }, [lastSyncAt, latencyMs, dataSource, status, degraded, marketData, errors, message]);

  return (
    <section className={styles.section} data-panel-id="broker-activity">
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Activity</h2>
        <p className={styles.sectionNote}>Syncs · status · errors · read-only</p>
      </div>
      <ul className={styles.activityList}>
        {items.map((item) => (
          <li key={item.id} data-kind={item.kind} className={styles.activityItem}>
            <span className={styles.activityTime}>
              {item.at ? new Date(item.at).toLocaleTimeString() : "—"}
            </span>
            <span className={styles.activityKind}>{item.kind.toUpperCase()}</span>
            <span className={styles.activityText}>{item.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
