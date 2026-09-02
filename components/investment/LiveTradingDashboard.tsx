"use client";

import { useCallback, useEffect, useState } from "react";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import styles from "@/styles/investment/live-dashboard.module.css";
import type {
  LiveApprovalRow,
  LiveApprovalStatus,
  LiveTradingDashboardReadModel,
  ReadinessStatus,
} from "./live-dashboard.types";

const POLL_MS = 8_000;

const APPROVAL_STATUSES: LiveApprovalStatus[] = [
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "BLOCKED",
  "EXECUTED",
];

type EmergencyActionId =
  | "EMERGENCY_STOP"
  | "BLOCK_NEW_ENTRIES"
  | "CLOSE_POSITIONS_SAFELY"
  | "CANCEL_ENTRY_ORDERS"
  | "CANCEL_ALL_OPEN_ORDERS"
  | "REDUCE_ONLY_MODE"
  | "DISCONNECT_EXECUTION";

interface Props {
  readonly initialReadModel: LiveTradingDashboardReadModel;
}

function fmtNum(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "NO_DATA";
  return value.toFixed(digits);
}

function statusClass(status: ReadinessStatus): string {
  if (status === "OK") return styles.statusOk;
  if (status === "WARN") return styles.statusWarn;
  if (status === "FAIL") return styles.statusFail;
  return styles.statusMuted;
}

function flagClass(ok: boolean, dangerWhenTrue = false): string {
  if (dangerWhenTrue) return ok ? styles.flagDanger : styles.flagOk;
  return ok ? styles.flagOk : styles.flagWarn;
}

export function LiveTradingDashboard({ initialReadModel }: Props) {
  const [readModel, setReadModel] = useState(initialReadModel);
  const [message, setMessage] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState<EmergencyActionId | null>(null);
  const [approvalConfirmId, setApprovalConfirmId] = useState<string | null>(null);
  const [localApprovals, setLocalApprovals] = useState<LiveApprovalRow[]>([
    ...initialReadModel.approvals,
  ]);

  const locked =
    readModel.safety.state === "LOCKED" ||
    readModel.safety.state === "HALTED" ||
    readModel.safety.autonomousLock !== "ACTIVE" ||
    !readModel.safety.liveTradingEnabled;

  const refresh = useCallback(async () => {
    const result = await safeJsonFetch<LiveTradingDashboardReadModel & { error?: string }>(
      "/api/investment/live",
      { cache: "no-store" },
    );
    if (!result.ok || !result.data) {
      throw new Error(result.error ?? "Live trading snapshot unavailable");
    }
    setReadModel(result.data);
    setLocalApprovals([...result.data.approvals]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    refresh()
      .catch((error) => {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Refresh failed");
        }
      })
      .finally(() => {
        if (!cancelled) {
          timer = setInterval(() => {
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

  function requestEmergency(action: EmergencyActionId) {
    setPendingConfirm(action);
    setMessage("");
  }

  function runEmergencyDryRun(action: EmergencyActionId) {
    setPendingConfirm(null);
    setMessage(
      locked
        ? `DRY_RUN · ${action} · AUTONOMOUS_LIVE=${readModel.safety.autonomousLock} (no broker mutation)`
        : `DRY_RUN · ${action} · confirmation recorded only — order path not wired`,
    );
  }

  function startApprovalSecondConfirm(row: LiveApprovalRow) {
    if (locked) return;
    if (row.status !== "PENDING_REVIEW" && row.status !== "APPROVED") return;
    setApprovalConfirmId(row.id);
  }

  function applyApprovalStatus(id: string, status: LiveApprovalStatus) {
    setLocalApprovals((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              status,
              firstConfirmedAt: row.firstConfirmedAt ?? new Date().toISOString(),
              secondConfirmedAt:
                status === "APPROVED" ? new Date().toISOString() : row.secondConfirmedAt,
              note:
                status === "APPROVED"
                  ? "Double-confirmed — awaiting separate execute step (disabled while LOCKED)"
                  : row.note,
            }
          : row,
      ),
    );
    setApprovalConfirmId(null);
    setMessage(
      locked
        ? `Approval UI blocked · LOCKED · no execution`
        : `Approval marked ${status} · execution requires separate step (not sent)`,
    );
  }

  const daily = readModel.dailyRisk;
  const system = readModel.systemState;
  const broker = readModel.brokerState;
  const ai = readModel.aiState;
  const ops = readModel.operations;
  const profit = readModel.profitability;
  const perf = readModel.systemPerformance;

  return (
    <section className={styles.root} aria-label="Investment OS live control">
      <div className={styles.banner} role="status">
        <span className={styles.bannerChip}>REAL MONEY</span>
        <span className={styles.bannerChip}>AUTONOMOUS EXECUTION</span>
        <span className={styles.bannerChip}>CAPITAL AT RISK</span>
      </div>
      <div className={`${styles.banner} ${styles.bannerLocked}`} role="status">
        <span className={styles.bannerChip}>AUTONOMOUS_LIVE {readModel.safety.autonomousLock}</span>
        <span>
          LOCKED until certified · LIVE_TRADING_ENABLED={String(readModel.safety.liveTradingEnabled)} ·
          IBKR_READ_ONLY={String(readModel.safety.ibkrReadOnly)} · ordersSubmitted=
          {ops.ordersSubmitted}
        </span>
      </div>

      <header className={styles.header}>
        <h1>Live</h1>
        <p>
          Investment OS control center — IBKR read-only via BrokerEngine, continuous analysis + ensemble +
          risk overlay. No automatic order send.
        </p>
        <div className={styles.flagRow}>
          <span className={flagClass(!readModel.safety.liveTradingEnabled)}>
            LIVE_TRADING_ENABLED={String(readModel.safety.liveTradingEnabled)}
          </span>
          <span className={flagClass(readModel.safety.ibkrReadOnly)}>
            IBKR_READ_ONLY={String(readModel.safety.ibkrReadOnly)}
          </span>
          <span className={styles.flagMuted}>TRADING_MODE={readModel.safety.tradingMode}</span>
          <span className={styles.flagMuted}>MODE={readModel.safety.mode}</span>
          <span className={locked ? styles.flagWarn : styles.flagDanger}>
            STATE={readModel.safety.state}
          </span>
          <span className={styles.flagMuted}>DATA={system.dataFreshness}</span>
          {(readModel.badges ?? []).map((badge) => (
            <span key={badge} className={styles.flagMuted}>
              {badge}
            </span>
          ))}
        </div>
        {message ? <p className={styles.message}>{message}</p> : null}
      </header>

      <div className={styles.grid2}>
        <article className={styles.panel}>
          <h2>System state</h2>
          <div className={styles.metrics}>
            <div className={styles.metric}>
              <span>Trading mode</span>
              <strong>{system.tradingMode}</strong>
            </div>
            <div className={styles.metric}>
              <span>Autonomous lock</span>
              <strong>{system.autonomousLock}</strong>
            </div>
            <div className={styles.metric}>
              <span>Data</span>
              <strong>{system.dataFreshness}</strong>
            </div>
            <div className={styles.metric}>
              <span>Block entries</span>
              <strong>{String(system.blockNewEntries)}</strong>
            </div>
          </div>
          <p className={styles.panelMeta}>{system.haltReason ?? "No active halt"}</p>
        </article>

        <article className={styles.panel}>
          <h2>Broker state</h2>
          <div className={styles.metrics}>
            <div className={styles.metric}>
              <span>Connected</span>
              <strong>{String(broker.connected)}</strong>
            </div>
            <div className={styles.metric}>
              <span>Health</span>
              <strong>{broker.healthOk == null ? "NO_DATA" : String(broker.healthOk)}</strong>
            </div>
            <div className={styles.metric}>
              <span>nextValidId</span>
              <strong>{broker.nextValidId}</strong>
            </div>
            <div className={styles.metric}>
              <span>Accounts</span>
              <strong>{broker.accountsMasked.length ? broker.accountsMasked.join(", ") : "NO_DATA"}</strong>
            </div>
          </div>
          <p className={styles.panelMeta}>{broker.error ?? "IBKR read paths via BrokerEngine"}</p>
        </article>
      </div>

      <div className={styles.grid2}>
        <article className={styles.panel}>
          <h2>AI state</h2>
          <div className={styles.metrics}>
            <div className={styles.metric}>
              <span>Brain</span>
              <strong className={statusClass(ai.brain)}>{ai.brain}</strong>
            </div>
            <div className={styles.metric}>
              <span>Committee</span>
              <strong className={statusClass(ai.committee)}>{ai.committee}</strong>
            </div>
            <div className={styles.metric}>
              <span>Strategies</span>
              <strong>{ai.ensembleStrategies}</strong>
            </div>
            <div className={styles.metric}>
              <span>Loop</span>
              <strong>{ai.analysisLoop}</strong>
            </div>
          </div>
          <p className={styles.panelMeta}>{ai.detail}</p>
        </article>

        <article className={styles.panel}>
          <h2>Operations / Profitability</h2>
          <div className={styles.metrics}>
            <div className={styles.metric}>
              <span>Open orders</span>
              <strong>{ops.openOrders}</strong>
            </div>
            <div className={styles.metric}>
              <span>Positions</span>
              <strong>{ops.positions}</strong>
            </div>
            <div className={styles.metric}>
              <span>TRADE opps</span>
              <strong>{ops.opportunities}</strong>
            </div>
            <div className={styles.metric}>
              <span>NO_TRADE</span>
              <strong>{ops.noTradeCount}</strong>
            </div>
            <div className={styles.metric}>
              <span>Unrealized P&amp;L</span>
              <strong>{fmtNum(profit.unrealizedPnl)}</strong>
            </div>
            <div className={styles.metric}>
              <span>Orders submitted</span>
              <strong>{ops.ordersSubmitted}</strong>
            </div>
          </div>
          <p className={styles.panelMeta}>{profit.note}</p>
        </article>
      </div>

      <div className={styles.grid2}>
        <article className={styles.panel}>
          <h2>System readiness</h2>
          <p className={styles.panelMeta}>Generated {readModel.generatedAt}</p>
          <ul className={styles.readinessList}>
            {readModel.readiness.map((item) => (
              <li key={item.id}>
                <span className={styles.readinessLabel}>{item.label}</span>
                <span className={statusClass(item.status)}>
                  [{item.status}] {item.detail}
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className={styles.panel}>
          <h2>Strategy readiness gates</h2>
          <p className={styles.panelMeta}>
            goLive={readModel.strategyReadiness.goLiveDecision} · overall=
            {readModel.strategyReadiness.overallSample} · unlockEligible=false
          </p>
          <div className={styles.metrics}>
            <div className={styles.metric}>
              <span>Paper trades</span>
              <strong>{readModel.strategyReadiness.paperClosedTrades}</strong>
            </div>
            <div className={styles.metric}>
              <span>Paper sessions</span>
              <strong>{readModel.strategyReadiness.paperSessions}</strong>
            </div>
            <div className={styles.metric}>
              <span>Shadow ops</span>
              <strong>{readModel.strategyReadiness.shadowOps}</strong>
            </div>
            <div className={styles.metric}>
              <span>Shadow days</span>
              <strong>{readModel.strategyReadiness.shadowDays}</strong>
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Gate</th>
                  <th>Status</th>
                  <th>Required</th>
                  <th>Actual</th>
                </tr>
              </thead>
              <tbody>
                {readModel.strategyReadiness.gates.map((g) => (
                  <tr key={g.id}>
                    <td>{g.name}</td>
                    <td>{g.status}</td>
                    <td>{g.required}</td>
                    <td>{g.actual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.panelMeta}>{readModel.strategyReadiness.note}</p>
        </article>
      </div>

      <article className={styles.panel}>
        <h2>GO_LIVE unlock (human)</h2>
        <p className={styles.panelMeta}>{readModel.goLiveUnlock.note}</p>
        <ul className={styles.readinessList}>
          <li>
            <span className={styles.readinessLabel}>Blocked</span>
            <span className={styles.statusFail}>true</span>
          </li>
          <li>
            <span className={styles.readinessLabel}>Reason</span>
            <span className={styles.statusMuted}>{readModel.goLiveUnlock.reason}</span>
          </li>
          <li>
            <span className={styles.readinessLabel}>AUTONOMOUS_LIVE</span>
            <span className={styles.statusOk}>{readModel.goLiveUnlock.autonomousLive}</span>
          </li>
          <li>
            <span className={styles.readinessLabel}>LIVE_TRADING_ENABLED</span>
            <span className={styles.statusOk}>false</span>
          </li>
        </ul>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.actionBtn}
            disabled
            title="GO_LIVE unlock disabled until certification PASS — never auto-unlocks"
            onClick={() => {
              setMessage(
                "BLOCKED — GO_LIVE unlock does not set LIVE_TRADING_ENABLED=true from this UI",
              );
            }}
          >
            Unlock GO_LIVE (disabled)
          </button>
        </div>
      </article>

      <div className={styles.grid2}>
        <article className={styles.panel}>
          <h2>Daily risk / Limits</h2>
          <div className={styles.metrics}>
            <div className={styles.metric}>
              <span>Daily P&amp;L</span>
              <strong>{fmtNum(daily.dailyPnl)}</strong>
            </div>
            <div className={styles.metric}>
              <span>Max loss %</span>
              <strong>{fmtNum(daily.maxLoss)}</strong>
            </div>
            <div className={styles.metric}>
              <span>Exposure</span>
              <strong>{fmtNum(daily.exposure)}</strong>
            </div>
            <div className={styles.metric}>
              <span>Max notional €</span>
              <strong>{readModel.limits.maxOrderNotionalEur}</strong>
            </div>
            <div className={styles.metric}>
              <span>Max positions</span>
              <strong>{readModel.limits.maxOpenPositions}</strong>
            </div>
            <div className={styles.metric}>
              <span>Max trades/day</span>
              <strong>{readModel.limits.maxTradesPerDay}</strong>
            </div>
          </div>
          <p className={styles.panelMeta}>{daily.remainingLimits}</p>
          <p className={styles.panelMeta}>{daily.note}</p>
        </article>
      </div>

      <article className={styles.panel}>
        <h2>Prioritized opportunities</h2>
        {readModel.candidates.length === 0 ? (
          <p className={styles.empty}>Empty queue — no live proposals.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Pri</th>
                  <th>Symbol</th>
                  <th>Side</th>
                  <th>Decision</th>
                  <th>Score</th>
                  <th>Data</th>
                  <th>Entry</th>
                  <th>Stop</th>
                  <th>Target</th>
                  <th>Conf</th>
                  <th>Consensus</th>
                  <th>Risk</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {readModel.candidates.map((row) => (
                  <tr key={row.id}>
                    <td>{row.priority ?? "—"}</td>
                    <td>{row.symbol}</td>
                    <td>{row.side}</td>
                    <td>{row.decision ?? "—"}</td>
                    <td>{fmtNum(row.score)}</td>
                    <td>{row.dataFreshness ?? "—"}</td>
                    <td>{fmtNum(row.entry)}</td>
                    <td>{fmtNum(row.stop)}</td>
                    <td>{fmtNum(row.target)}</td>
                    <td>{fmtNum(row.confidence)}</td>
                    <td>{row.committeeConsensus}</td>
                    <td>{row.riskDecision}</td>
                    <td>{(row.reasoning ?? [])[0] ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className={styles.panel}>
        <h2>Active signals</h2>
        {readModel.activeSignals.length === 0 ? (
          <p className={styles.empty}>No TRADE signals — data must be LIVE + ensemble consensus.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Side</th>
                  <th>Strength</th>
                  <th>Source</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {readModel.activeSignals.map((sig) => (
                  <tr key={sig.id}>
                    <td>{sig.symbol}</td>
                    <td>{sig.side}</td>
                    <td>{fmtNum(sig.strength)}</td>
                    <td>{sig.source}</td>
                    <td>{sig.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className={styles.panel}>
        <h2>Approval center</h2>
        <p className={styles.panelMeta}>
          Statuses: {APPROVAL_STATUSES.join(" · ")} — buttons disabled while LOCKED.
        </p>
        {localApprovals.length === 0 ? (
          <p className={styles.empty}>No approvals pending.</p>
        ) : (
          <div className={styles.actions}>
            {localApprovals.map((row) => (
              <div key={row.id} className={styles.approvalCard}>
                <div>
                  {row.symbol} {row.side} qty:{row.qty} · {row.status} · expires {row.expiresAt}
                </div>
                {row.note ? <div className={styles.panelMeta}>{row.note}</div> : null}
                <div className={styles.approvalActions}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    disabled={locked || row.status !== "PENDING_REVIEW"}
                    onClick={() => startApprovalSecondConfirm(row)}
                  >
                    Approve (1st)
                  </button>
                  <button
                    type="button"
                    className={styles.confirmBtn}
                    disabled={locked || approvalConfirmId !== row.id}
                    onClick={() => applyApprovalStatus(row.id, "APPROVED")}
                  >
                    Confirm approval (2nd)
                  </button>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    disabled={locked || row.status === "EXECUTED"}
                    onClick={() => applyApprovalStatus(row.id, "REJECTED")}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    disabled
                    title="Execute requires unlocked live trading — not available"
                  >
                    Execute (disabled)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

      <div className={styles.grid2}>
        <article className={styles.panel}>
          <h2>Open orders</h2>
          <p className={styles.panelMeta}>IBKR realtime read-only</p>
          {readModel.openOrders.length === 0 ? (
            <p className={styles.empty}>NO_DATA / no open orders</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Id</th>
                    <th>Symbol</th>
                    <th>Action</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Limit</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {readModel.openOrders.map((order) => (
                    <tr key={order.orderId}>
                      <td>{order.orderId}</td>
                      <td>{order.symbol}</td>
                      <td>{order.action}</td>
                      <td>{order.orderType}</td>
                      <td>{order.quantity}</td>
                      <td>{order.limitPrice == null ? "—" : fmtNum(order.limitPrice)}</td>
                      <td>{order.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className={styles.panel}>
          <h2>Positions + defensive overlay</h2>
          <p className={styles.panelMeta}>Read-only IBKR positions with LOCKED defensive recommendations</p>
          {readModel.positions.length === 0 ? (
            <p className={styles.empty}>NO_DATA / no positions</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Symbol</th>
                    <th>Qty</th>
                    <th>Avg cost</th>
                    <th>Stop</th>
                    <th>Target</th>
                    <th>Overlay</th>
                  </tr>
                </thead>
                <tbody>
                  {readModel.positions.map((pos) => (
                    <tr key={`${pos.account}-${pos.symbol}`}>
                      <td>{pos.account}</td>
                      <td>{pos.symbol}</td>
                      <td>{pos.position}</td>
                      <td>{fmtNum(pos.avgCost)}</td>
                      <td>{pos.stopProtection}</td>
                      <td>{pos.targetProtection}</td>
                      <td>
                        {pos.overlayAction ?? "—"}
                        {pos.overlayReason ? ` · ${pos.overlayReason}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </div>

      <div className={styles.grid2}>
        <article className={styles.panel}>
          <h2>Circuit breakers</h2>
          {readModel.circuitBreakers.length === 0 ? (
            <p className={styles.empty}>None active</p>
          ) : (
            <ul className={styles.readinessList}>
              {readModel.circuitBreakers.map((cb) => (
                <li key={`${cb.code}-${cb.at}`}>
                  <span className={styles.readinessLabel}>{cb.code}</span>
                  <span className={styles.statusWarn}>
                    {cb.reason} · {cb.at}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className={styles.panel}>
          <h2>System performance</h2>
          <div className={styles.metrics}>
            <div className={styles.metric}>
              <span>Snapshot ms</span>
              <strong>{perf.snapshotLatencyMs ?? "NO_DATA"}</strong>
            </div>
            <div className={styles.metric}>
              <span>Symbols scanned</span>
              <strong>{perf.symbolsScanned}</strong>
            </div>
            <div className={styles.metric}>
              <span>Stages OK</span>
              <strong>{String(perf.stagesOk)}</strong>
            </div>
          </div>
          <p className={styles.panelMeta}>{perf.note}</p>
        </article>
      </div>

      <article className={styles.panel}>
        <h2>History / Audit / Logs</h2>
        {(readModel.history.length === 0 && readModel.auditLog.length === 0) ? (
          <p className={styles.empty}>No audit entries</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>At</th>
                  <th>Event</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {[...readModel.history, ...readModel.auditLog].slice(0, 30).map((row) => (
                  <tr key={row.id}>
                    <td>{row.at}</td>
                    <td>{row.event}</td>
                    <td>{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className={styles.panel}>
        <h2>Emergency controls</h2>
        <p className={styles.panelMeta}>
          While LOCKED: dry-run only — BLOCK NEW ENTRIES / CLOSE POSITIONS SAFELY / CANCEL ENTRY ORDERS never
          call broker submit.
        </p>
        <div className={styles.actions}>
          {(
            [
              ["EMERGENCY_STOP", "Emergency Stop"],
              ["BLOCK_NEW_ENTRIES", "Block New Entries"],
              ["CLOSE_POSITIONS_SAFELY", "Close Positions Safely"],
              ["CANCEL_ENTRY_ORDERS", "Cancel Entry Orders"],
              ["CANCEL_ALL_OPEN_ORDERS", "Cancel All Open Orders"],
              ["REDUCE_ONLY_MODE", "Reduce Only Mode"],
              ["DISCONNECT_EXECUTION", "Disconnect Execution"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
              onClick={() => requestEmergency(id)}
            >
              {label}
              {locked ? " (dry-run)" : ""}
            </button>
          ))}
        </div>
        {pendingConfirm ? (
          <div className={styles.confirmBox} role="alertdialog" aria-label="Confirm emergency action">
            <p>
              Confirm {pendingConfirm}?{" "}
              {locked
                ? "LOCKED — will not call broker cancel/order APIs."
                : "This surface still does not send live order mutations."}
            </p>
            <div className={styles.confirmRow}>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={() => runEmergencyDryRun(pendingConfirm)}
              >
                Confirm
              </button>
              <button type="button" className={styles.cancelBtn} onClick={() => setPendingConfirm(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </article>
    </section>
  );
}
