export interface ExecutionControlDashboardModel {
  readonly liveTradingEnabledValue: string;
  readonly killSwitchEnabled: boolean;
  readonly pendingApprovals: ReadonlyArray<{
    approvalId: string;
    draftId: string;
    expiresAt: string;
    expiresInSec: number;
  }>;
  readonly whatIfResults: ReadonlyArray<{
    operationId: string;
    estimatedMargin: number;
    estimatedCommission: number;
  }>;
  readonly auditTimeline: ReadonlyArray<{
    id: string;
    at: string;
    actor: string;
    event: string;
    operationId: string;
  }>;
}

interface Props {
  readonly model: ExecutionControlDashboardModel;
}

export function ExecutionControlDashboard({ model }: Props) {
  const bannerTone = model.liveTradingEnabledValue === "false" ? "#0f766e" : "#dc2626";
  return (
    <section style={{ display: "grid", gap: 16, padding: 20 }}>
      <div
        style={{
          border: `2px solid ${bannerTone}`,
          borderRadius: 10,
          padding: "10px 14px",
          background: "#0b1020",
          color: "#f8fafc",
        }}
      >
        <strong>LIVE SAFETY BANNER</strong>: LIVE_TRADING_ENABLED={model.liveTradingEnabledValue}
      </div>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <article style={{ border: "1px solid #d1d5db", borderRadius: 10, padding: 12 }}>
          <h2>Pending Approvals</h2>
          {model.pendingApprovals.length === 0 ? (
            <p>No pending approvals.</p>
          ) : (
            <ul>
              {model.pendingApprovals.map((item) => (
                <li key={item.approvalId}>
                  {item.approvalId} ({item.draftId}) - expires in {item.expiresInSec}s at {item.expiresAt}
                </li>
              ))}
            </ul>
          )}
        </article>
        <article style={{ border: "1px solid #d1d5db", borderRadius: 10, padding: 12 }}>
          <h2>WhatIf Results</h2>
          {model.whatIfResults.length === 0 ? (
            <p>No executions recorded yet.</p>
          ) : (
            <ul>
              {model.whatIfResults.map((item) => (
                <li key={item.operationId}>
                  {item.operationId} - margin {item.estimatedMargin.toFixed(2)} / commission{" "}
                  {item.estimatedCommission.toFixed(2)}
                </li>
              ))}
            </ul>
          )}
        </article>
        <article style={{ border: "1px solid #d1d5db", borderRadius: 10, padding: 12 }}>
          <h2>Emergency Controls</h2>
          <p>Kill switch: {model.killSwitchEnabled ? "ENABLED" : "DISABLED"}</p>
          <p>Cancel-all: controlled by LiveExecutionEngine command handler.</p>
        </article>
      </div>
      <article style={{ border: "1px solid #d1d5db", borderRadius: 10, padding: 12 }}>
        <h2>Audit Timeline</h2>
        {model.auditTimeline.length === 0 ? (
          <p>No audit events recorded yet.</p>
        ) : (
          <ol>
            {model.auditTimeline.map((entry) => (
              <li key={entry.id}>
                {entry.at} - {entry.actor} - {entry.event} ({entry.operationId})
              </li>
            ))}
          </ol>
        )}
      </article>
    </section>
  );
}
