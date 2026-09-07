"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import {
  EXECUTION_MANAGER_STATES,
  type ExecutionManagerState,
} from "@/lib/investment/execution-manager-status";
import { isMutationLocked } from "@/lib/investment/execution-manager-actions";
import styles from "@/styles/investment/execution-manager.module.css";
import type {
  DryRunActionResult,
  ExecutionManagerOrderRow,
  ExecutionManagerSnapshot,
} from "./execution-manager.types";

const POLL_MS = 10_000;

function fmtNum(value: number | null | undefined, digits = 4): string {
  if (value == null || !Number.isFinite(value)) return "NO_DATA";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "NO_DATA";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function stateClass(state: ExecutionManagerState): string {
  if (state === "Filled") return styles.stateFilled;
  if (state === "Partially Filled") return styles.statePartial;
  if (state === "Rejected") return styles.stateRejected;
  if (state === "Cancelled" || state === "Expired") return styles.stateCancelled;
  if (state === "Working" || state === "Submitted" || state === "Accepted") return styles.stateWorking;
  if (state === "Pending" || state === "Draft" || state === "Validated") return styles.statePending;
  return "";
}

function emptySnapshot(): ExecutionManagerSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    safety: {
      mode: "ANALYSIS_ONLY",
      liveTradingEnabled: false,
      liveTradingEnabledValue: "false",
      ibkrReadOnly: true,
      killSwitchEnabled: false,
      autonomousLock: "LOCKED",
      mutationsEnabled: false,
      gate: "LOCKED",
    },
    brokerConnected: null,
    dataSource: "UNAVAILABLE",
    orders: [],
    auditItems: [],
    executionAudit: [],
    note: "Loading…",
  };
}

function matchesQuery(row: ExecutionManagerOrderRow, q: string): boolean {
  if (!q) return true;
  const hay = [
    row.uuid,
    row.orderId,
    row.brokerId,
    row.estado,
    row.estadoLabel,
    row.rawStatus,
    row.activo,
    row.cuentaMasked,
    row.tipo,
    row.side,
    row.responsable,
    row.origen,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function exportCsv(rows: readonly ExecutionManagerOrderRow[]): void {
  const headers = [
    "UUID",
    "Order ID",
    "Broker ID",
    "Estado",
    "Raw Status",
    "Activo",
    "Cuenta",
    "Precio",
    "Cantidad",
    "Tipo",
    "Side",
    "Stop",
    "Take Profit",
    "Trailing",
    "Fecha",
    "Responsable",
    "Origen",
  ];
  const lines = rows.map((r) =>
    [
      r.uuid,
      r.orderId,
      r.brokerId,
      r.estado,
      r.rawStatus,
      r.activo,
      r.cuentaMasked,
      r.precio ?? "",
      r.cantidad,
      r.tipo,
      r.side,
      r.stop ?? "",
      r.takeProfit ?? "",
      r.trailing ?? "",
      r.fecha ?? "",
      r.responsable,
      r.origen,
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[headers.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `forgeos-execution-manager-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  readonly initialSnapshot: ExecutionManagerSnapshot;
}

export function ExecutionManagerDashboard({ initialSnapshot }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSnapshot.orders[0]?.uuid ?? null,
  );
  const [localDrafts, setLocalDrafts] = useState<ExecutionManagerOrderRow[]>([]);
  const [busyAction, setBusyAction] = useState(false);

  const locked = isMutationLocked(snapshot.safety);

  const refresh = useCallback(async () => {
    const result = await safeJsonFetch<ExecutionManagerSnapshot & { error?: string }>(
      "/api/investment/orders",
      { cache: "no-store" },
    );
    if (!result.ok || !result.data) {
      throw new Error(result.error ?? "Execution Manager snapshot unavailable");
    }
    setSnapshot(result.data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    refresh()
      .catch((error) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Refresh failed");
      })
      .finally(() => {
        if (!cancelled) {
          timer = setInterval(() => {
            if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
            refresh().catch((error) => {
              setMessage(error instanceof Error ? error.message : "Refresh failed");
            });
          }, POLL_MS);
        }
      });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [refresh]);

  const allOrders = useMemo(
    () => [...localDrafts, ...snapshot.orders],
    [localDrafts, snapshot.orders],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allOrders.filter((row) => {
      if (estadoFilter !== "ALL" && row.estado !== estadoFilter) return false;
      return matchesQuery(row, q);
    });
  }, [allOrders, query, estadoFilter]);

  const selected = filtered.find((r) => r.uuid === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (selected && selected.uuid !== selectedId) setSelectedId(selected.uuid);
    if (!selected && selectedId) setSelectedId(null);
  }, [selected, selectedId]);

  async function runAction(action: "cancel" | "modify" | "duplicate") {
    if (!selected) return;
    setBusyAction(true);
    setMessage("");
    try {
      const result = await safeJsonFetch<DryRunActionResult>(
        "/api/investment/orders",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            state: selected.estado,
            orderId: selected.orderId,
            patch:
              action === "modify"
                ? { limitPrice: selected.precio, quantity: selected.cantidad }
                : action === "duplicate"
                  ? { sourceUuid: selected.uuid, sourceOrderId: selected.orderId }
                  : undefined,
          }),
        },
      );
      const body = result.data;
      const msg =
        body?.message ??
        result.error ??
        `${locked ? "LOCKED" : "OPEN"} · ${action.toUpperCase()}`;
      setMessage(msg);

      if (action === "duplicate" && body) {
        const draft: ExecutionManagerOrderRow = {
          ...selected,
          uuid: `draft-${Date.now()}-${selected.orderId}`,
          orderId: "DRAFT",
          brokerId: "LOCAL",
          estado: "Draft",
          estadoLabel: "Draft",
          rawStatus: "Draft",
          statusMapped: true,
          fecha: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          responsable: "Execution Manager",
          origen: `DUPLICATE_OF:${selected.orderId}`,
          filled: null,
          remaining: selected.cantidad,
          avgFillPrice: null,
        };
        setLocalDrafts((prev) => [draft, ...prev]);
        setSelectedId(draft.uuid);
        setMessage(`${msg} · local draft created (not submitted)`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusyAction(false);
    }
  }

  const timelineItems = useMemo(() => {
    const fromMemory = snapshot.auditItems.map((item) => ({
      id: item.id,
      at: item.occurredAt,
      title: item.kind,
      detail: `${item.symbol} · ${item.summary}`,
      source: item.provenance,
    }));
    const fromExec = snapshot.executionAudit.map((item) => ({
      id: item.id,
      at: item.at,
      title: item.event,
      detail: `${item.actor} · op=${item.operationId}`,
      source: "live-execution",
    }));
    return [...fromExec, ...fromMemory]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 50);
  }, [snapshot.auditItems, snapshot.executionAudit]);

  return (
    <section className={styles.root} data-testid="execution-manager">
      <div className={styles.banner} role="status">
        <strong>Execution Manager</strong>
        <span className={styles.bannerChip}>{snapshot.mode}</span>
        <span className={styles.bannerChip}>
          LIVE_TRADING_ENABLED={snapshot.safety.liveTradingEnabledValue}
        </span>
        <span className={styles.bannerChip}>
          IBKR_READ_ONLY={String(snapshot.safety.ibkrReadOnly)}
        </span>
        <span className={styles.bannerChip}>{snapshot.safety.autonomousLock}</span>
        <span className={styles.bannerChip}>
          mutations={snapshot.safety.mutationsEnabled ? "ENABLED" : "DISABLED"}
        </span>
      </div>

      <header className={styles.header}>
        <h1>Execution Manager</h1>
        <p>
          Centralized order visibility and control surfaces. Reads IBKR open orders via broker
          engine — Cancel / Modify / Duplicate are{" "}
          {locked ? "LOCKED" : "OPEN (LIVE_TRADING_ENABLED=true, IBKR_READ_ONLY=false)"}.
        </p>
        <div className={styles.flagRow}>
          <span className={snapshot.brokerConnected ? styles.flagOk : styles.flagWarn}>
            Broker:{" "}
            {snapshot.brokerConnected == null
              ? "UNKNOWN"
              : snapshot.brokerConnected
                ? "CONNECTED"
                : "DISCONNECTED"}
          </span>
          <span className={styles.flagMuted}>Source: {snapshot.dataSource}</span>
          <span className={styles.flagMuted}>Orders: {snapshot.orders.length}</span>
          <span className={styles.flagMuted}>Synced: {fmtDate(snapshot.generatedAt)}</span>
          <span className={locked ? styles.flagWarn : styles.flagOk}>
            Gate: {snapshot.safety.gate ?? (locked ? "LOCKED" : "OPEN")}
          </span>
        </div>
      </header>

      <div className={styles.toolbar}>
        <input
          type="search"
          placeholder="Search UUID, orderId, symbol, estado, cuenta…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search orders"
        />
        <select
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value)}
          aria-label="Filter by estado"
        >
          <option value="ALL">All estados</option>
          {EXECUTION_MANAGER_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="button" className={styles.btn} onClick={() => void refresh()}>
          Refresh
        </button>
        <button
          type="button"
          className={styles.btnGhost}
          onClick={() => exportCsv(filtered)}
          disabled={filtered.length === 0}
        >
          Export CSV
        </button>
      </div>

      {message ? <p className={styles.message}>{message}</p> : null}
      <p className={styles.message}>{snapshot.note}</p>

      <div className={styles.grid2}>
        <article className={styles.panel}>
          <h2>Orders ({filtered.length})</h2>
          <p className={styles.panelMeta}>
            Fields: UUID · Order ID · Broker ID · Estado · Activo · Cuenta (masked) · Precio ·
            Cantidad · Tipo · Stop · TP · Trailing · Fecha · Responsable · Origen
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>UUID</th>
                  <th>Order ID</th>
                  <th>Broker ID</th>
                  <th>Estado</th>
                  <th>Activo</th>
                  <th>Cuenta</th>
                  <th>Precio</th>
                  <th>Cantidad</th>
                  <th>Tipo</th>
                  <th>Stop</th>
                  <th>Take Profit</th>
                  <th>Trailing</th>
                  <th>Fecha</th>
                  <th>Responsable</th>
                  <th>Origen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={15}>
                      <p className={styles.empty}>NO_DATA — no orders match filters</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr
                      key={row.uuid}
                      data-selected={selected?.uuid === row.uuid ? "true" : "false"}
                      onClick={() => setSelectedId(row.uuid)}
                    >
                      <td title={row.uuid}>{row.uuid.slice(0, 8)}…</td>
                      <td>{row.orderId}</td>
                      <td>{row.brokerId}</td>
                      <td>
                        <span className={`${styles.statePill} ${stateClass(row.estado)}`}>
                          {row.estadoLabel}
                        </span>
                      </td>
                      <td>
                        {row.side} {row.activo}
                      </td>
                      <td>{row.cuentaMasked}</td>
                      <td>{fmtNum(row.precio)}</td>
                      <td>{fmtNum(row.cantidad, 6)}</td>
                      <td>{row.tipo}</td>
                      <td>{fmtNum(row.stop)}</td>
                      <td>{fmtNum(row.takeProfit)}</td>
                      <td>{fmtNum(row.trailing)}</td>
                      <td>{fmtDate(row.fecha)}</td>
                      <td>{row.responsable}</td>
                      <td>{row.origen}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className={styles.panel}>
          <h2>Order detail &amp; actions</h2>
          {!selected ? (
            <p className={styles.empty}>Select an order</p>
          ) : (
            <>
              <dl className={styles.detailGrid}>
                <dt>UUID</dt>
                <dd>{selected.uuid}</dd>
                <dt>Order ID</dt>
                <dd>{selected.orderId}</dd>
                <dt>Broker ID</dt>
                <dd>{selected.brokerId}</dd>
                <dt>Estado</dt>
                <dd>
                  {selected.estadoLabel}
                  {!selected.statusMapped ? ` · raw=${selected.rawStatus}` : ""}
                </dd>
                <dt>Activo</dt>
                <dd>
                  {selected.side} {selected.activo}
                </dd>
                <dt>Cuenta</dt>
                <dd>{selected.cuentaMasked}</dd>
                <dt>Precio</dt>
                <dd>{fmtNum(selected.precio)}</dd>
                <dt>Cantidad</dt>
                <dd>
                  {fmtNum(selected.cantidad, 6)}
                  {selected.filled != null ? ` · filled ${fmtNum(selected.filled, 6)}` : ""}
                  {selected.remaining != null ? ` · rem ${fmtNum(selected.remaining, 6)}` : ""}
                </dd>
                <dt>Tipo / TIF</dt>
                <dd>
                  {selected.tipo}
                  {selected.tif ? ` · ${selected.tif}` : ""}
                </dd>
                <dt>Stop / TP / Trail</dt>
                <dd>
                  {fmtNum(selected.stop)} / {fmtNum(selected.takeProfit)} /{" "}
                  {fmtNum(selected.trailing)}
                </dd>
                <dt>Fecha</dt>
                <dd>{fmtDate(selected.fecha)}</dd>
                <dt>Responsable</dt>
                <dd>{selected.responsable}</dd>
                <dt>Origen</dt>
                <dd>{selected.origen}</dd>
              </dl>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.btnDanger}
                  disabled={busyAction}
                  title={locked ? "LOCKED — mutations disabled" : "OPEN — cancel on IBKR"}
                  onClick={() => void runAction("cancel")}
                >
                  Cancel {locked ? "(LOCKED)" : "(OPEN)"}
                </button>
                <button
                  type="button"
                  className={styles.btn}
                  disabled={busyAction}
                  title={locked ? "LOCKED — mutations disabled" : "OPEN — modify on IBKR"}
                  onClick={() => void runAction("modify")}
                >
                  Modify {locked ? "(LOCKED)" : "(OPEN)"}
                </button>
                <button
                  type="button"
                  className={styles.btn}
                  disabled={busyAction}
                  title="Creates a local Draft copy only — never submits"
                  onClick={() => void runAction("duplicate")}
                >
                  Duplicate {locked ? "(LOCKED)" : "(OPEN)"}
                </button>
              </div>
              <p className={styles.message}>
                Posture: {locked ? "LOCKED — mutations disabled" : "OPEN — LIVE mutations enabled"}.
              </p>
            </>
          )}
        </article>
      </div>

      <div className={styles.grid2}>
        <article className={styles.panel}>
          <h2>Timeline / audit / events</h2>
          <p className={styles.panelMeta}>
            Investment Memory audit + live-execution audit (read-only)
          </p>
          {timelineItems.length === 0 ? (
            <p className={styles.empty}>NO_DATA — no audit events yet</p>
          ) : (
            <ol className={styles.timeline}>
              {timelineItems.map((item) => (
                <li key={item.id}>
                  <strong>{item.title}</strong>
                  <div>{fmtDate(item.at)}</div>
                  <div>{item.detail}</div>
                  <div>source: {item.source}</div>
                </li>
              ))}
            </ol>
          )}
        </article>

        <article className={styles.panel}>
          <h2>Related surfaces</h2>
          <p className={styles.panelMeta}>Reuse — do not duplicate broker/engine logic</p>
          <div className={styles.links}>
            <Link href="/investment/execution-control">Execution Control →</Link>
            <Link href="/investment/broker">Broker Terminal →</Link>
            <Link href="/investment/live">Live Trading →</Link>
            <Link href="/investment/audit">Audit Timeline →</Link>
          </div>
          <p className={styles.empty} style={{ marginTop: 12 }}>
            Open-order reads use the same IBKR path map as{" "}
            <code>components/broker/terminal/OrdersTable</code> via{" "}
            <code>/api/broker/orders</code> / <code>/api/ibkr/orders</code>. This page wraps them in{" "}
            <code>/api/investment/orders</code> with status normalization and gated actions.
          </p>
        </article>
      </div>
    </section>
  );
}

export { emptySnapshot };
