"use client";

import { maskAccountList } from "@/lib/ibkr/account-mask";
import { TerminalBadge, type BadgeTone } from "./Badge";
import { noData } from "./format";
import styles from "./terminal.module.css";
import { useBrokerTerminal } from "./use-broker-terminal-data";

function statusTone(connected: boolean | undefined): BadgeTone {
  if (connected === true) return "green";
  if (connected === false) return "red";
  return "amber";
}

function marketTone(label: string): BadgeTone {
  if (label === "LIVE") return "green";
  if (label === "DELAYED") return "amber";
  return "gray";
}

/**
 * Compact institutional broker header — badge strip + meta row.
 * Does not change IBKR connect path; ANALYSIS_ONLY.
 */
export function BrokerTerminalHeader() {
  const { snapshot, busy, connect, refresh, message } = useBrokerTerminal();
  const { health, status, lastSyncAt, latencyMs, dataSource, marketData, degraded, errors } = snapshot;

  const readOnly = health?.ibkrReadOnly ?? status?.ibkrReadOnly ?? true;
  const liveEnabled = health?.liveTradingEnabled ?? status?.liveTradingEnabled ?? false;
  const connected = status?.connected === true;
  const masked = maskAccountList(status?.managedAccounts ?? []);
  const syncLabel = lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : noData();
  const latencyLabel = typeof latencyMs === "number" ? `${latencyMs} ms` : noData();
  const fastapiOk = health?.ok === true;
  const twsState = connected
    ? status?.nextOrderIdReady
      ? "TWS READY"
      : "TWS PARTIAL"
    : "TWS OFFLINE";

  return (
    <section className={styles.section} data-panel-id="broker-header">
      <div className={styles.shellTitle}>
        <div>
          <h1>Interactive Brokers</h1>
          <p className={styles.shellMeta}>Read-only terminal · ANALYSIS_ONLY · no order execution</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.btn} disabled={busy} onClick={() => void connect()}>
            Connect
          </button>
          <button type="button" className={styles.btn} disabled={busy} onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
      </div>

      <div className={styles.badgeStrip} aria-label="Broker safety badges">
        <TerminalBadge tone={statusTone(status?.connected)}>
          {connected ? "CONNECTED" : status ? "DISCONNECTED" : noData()}
        </TerminalBadge>
        <TerminalBadge tone={readOnly ? "blue" : "amber"}>
          {readOnly ? "READ ONLY" : "TRADING"}
        </TerminalBadge>
        <TerminalBadge tone="blue">ANALYSIS ONLY</TerminalBadge>
        <TerminalBadge tone={liveEnabled ? "red" : "gray"}>
          LIVE TRADING {liveEnabled ? "ENABLED" : "DISABLED"}
        </TerminalBadge>
        <TerminalBadge tone={dataSource === "IBKR_LIVE_READ_ONLY" ? "green" : dataSource === "DEMO" ? "amber" : "gray"}>
          {dataSource}
        </TerminalBadge>
        <TerminalBadge tone={marketTone(marketData)}>{marketData}</TerminalBadge>
        <TerminalBadge tone={health?.emergencyStop ? "red" : "gray"}>
          EMERGENCY {health?.emergencyStop ? "ACTIVE" : "OFF"}
        </TerminalBadge>
      </div>

      <div className={styles.metaRow}>
        <Meta label="Account" value={masked[0] ?? noData()} />
        <Meta label="Accounts" value={masked.length ? String(masked.length) : noData()} />
        <Meta label="Last sync" value={syncLabel} />
        <Meta label="Latency" value={latencyLabel} />
        <Meta label="FastAPI" value={fastapiOk ? "OK" : health ? "DEGRADED" : noData()} />
        <Meta label="TWS / Gateway" value={twsState} />
        <Meta label="nextValidId" value={status?.nextValidId != null ? String(status.nextValidId) : noData()} />
      </div>

      {degraded ? (
        <p className={styles.degraded} role="status">
          Degraded — showing last known data / NO_DATA. Shell stays interactive. No orders.
        </p>
      ) : null}
      {message ? <p className={styles.message}>{message}</p> : null}
      {errors.status || errors.health ? (
        <p className={`${styles.message} ${styles.messageError}`}>
          {errors.status ?? errors.health}
        </p>
      ) : null}
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metaItem}>
      <span className={styles.headerLabel}>{label}</span>
      <strong className={styles.metaValue}>{value}</strong>
    </div>
  );
}
